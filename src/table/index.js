'use strict';

const assert = require('assert/strict'),
	{noWrap} = require('../../util/string'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr'),
	TdToken = require('./td'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute');

/**
 * @param {TableCoords} coords1
 * @param {TableCoords} coords2
 */
const cmpCoords = (coords1, coords2) => {
	const diff = coords1.row - coords2.row;
	return diff === 0 ? coords1.column - coords2.column : diff;
};

/** @param {Token} */
const isRowEnd = ({type}) => type === 'tr' || type === 'table-syntax';

/**
 * @param {TableCoords[]} rowLayout
 * @param {number} i
 */
const isStartCol = (rowLayout, i, oneCol = false) => {
	const coords = rowLayout[i];
	return rowLayout[i - 1] !== coords && (!oneCol || rowLayout[i + 1] !== coords);
};

/**
 * @param {Map<TdToken, boolean>} cells
 * @param {string|Record<string, string|boolean>} attr
 * @complexity `n`
 */
const format = (cells, attr = {}, multi = false) => {
	for (const [token, start] of cells) {
		if (multi || start) {
			if (typeof attr === 'string') {
				token.setSyntax(attr);
			} else {
				for (const [k, v] of Object.entries(attr)) {
					token.setAttr(k, v);
				}
			}
		}
	}
};

/**
 * @param {number} y
 * @param {TrToken} rowToken
 * @param {TableCoords[][]} layout
 * @param {number} maxCol
 * @param {Token} token
 * @complexity `n`
 */
const fill = (y, rowToken, layout, maxCol, token) => {
	const rowLayout = layout[y],
		{childNodes} = rowToken;
	let lastIndex = childNodes.findLastIndex(child => child instanceof TdToken && child.subtype !== 'caption');
	lastIndex = lastIndex === -1 ? undefined : lastIndex - childNodes.length;
	Parser.run(() => {
		for (let i = 0; i < maxCol; i++) {
			if (!rowLayout[i]) {
				rowToken.insertAt(token.cloneNode(), lastIndex);
			}
		}
	});
};

/** @extends {Array<TableCoords[]>} */
class Layout extends Array {
	/**
	 * 打印表格布局
	 * @complexity `n`
	 */
	print() {
		const hBorders = new Array(this.length + 1).fill().map((_, i) => {
				const prev = this[i - 1] ?? [],
					next = this[i] ?? [];
				return new Array(Math.max(prev.length, next.length)).fill().map((__, j) => prev[j] !== next[j]);
			}),
			vBorders = this.map(cur => new Array(cur.length + 1).fill().map((_, j) => cur[j - 1] !== cur[j]));
		let out = '';
		for (let i = 0; i <= this.length; i++) {
			const hBorder = hBorders[i],
				vBorderTop = vBorders[i - 1] ?? [],
				vBorderBottom = vBorders[i] ?? [],
				// eslint-disable-next-line no-sparse-arrays
				border = [' ',,, '┌',, '┐', '─', '┬',, '│', '└', '├', '┘', '┤', '┴', '┼'];
			for (let j = 0; j <= hBorder.length; j++) {
				// eslint-disable-next-line no-bitwise
				const bit = (vBorderTop[j] << 3) + Number(vBorderBottom[j]) + (hBorder[j - 1] << 2) + (hBorder[j] << 1);
				out += `${border[bit]}${hBorder[j] ? '─' : ' '}`;
			}
			out += '\n';
		}
		console.log(out.slice(0, -1));
	}
}

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	static openingPattern = /^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u;
	static closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, TableToken.openingPattern);
		this.setAttribute('acceptable', {
			Token: 2, SyntaxToken: [0, -1], AttributeToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @template {TrToken|SyntaxToken} T
	 * @param {T} token
	 * @returns {T}
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		const previous = this.children.at(i - 1),
			{closingPattern} = TableToken;
		if (token.type === 'td' && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.appendChild(token);
		} else if (!Parser.running && i === this.childNodes.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(token.toString())}`);
		}
		return super.insertAt(token, i);
	}

	/**
	 * 闭合表格语法
	 * @complexity `n`
	 * @param {string} syntax 表格结尾语法
	 * @param {boolean} halfParsed 是否是半解析状态
	 * @throws `SyntaxError` 表哥的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false) {
		halfParsed &&= Parser.running;
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = !halfParsed && Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastElementChild} = this,
			{closingPattern} = TableToken;
		if (!halfParsed && !closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(syntax)}`);
		} else if (lastElementChild instanceof SyntaxToken) {
			lastElementChild.replaceChildren(...inner.childNodes);
		} else {
			this.appendChild(Parser.run(() => {
				const token = new SyntaxToken(syntax, closingPattern, 'table-syntax', config, accum, {
					'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
				});
				if (inner) {
					token.replaceChildren(...inner.childNodes);
				}
				return token;
			}));
		}
	}

	/**
	 * 获取行数
	 * @returns {number}
	 * @complexity `n`
	 */
	getRowCount() {
		return super.getRowCount()
			+ this.children.filter(child => child.type === 'tr' && child.getRowCount()).length;
	}

	getPreviousRow() { // eslint-disable-line class-methods-use-this
		return undefined;
	}

	/**
	 * @override
	 * @complexity `n`
	 */
	getNextRow() {
		return this.getNthRow(super.getRowCount() ? 1 : 0);
	}

	/**
	 * @param {number} n
	 * @returns {TrToken}
	 * @complexity `n`
	 */
	getNthRow(n, force = false, insert = false) {
		if (typeof n !== 'number') {
			this.typeError('getNthRow', 'Number');
		}
		const nRows = this.getRowCount(),
			isRow = super.getRowCount();
		n = n < 0 ? n + nRows : n;
		if (n === 0 && (isRow || force && nRows === 0)) {
			return this;
		} else if (n < 0 || n > nRows || n === nRows && !insert) {
			throw new RangeError(`不存在第 ${n} 行！`);
		} else if (isRow) {
			n--;
		}
		for (const child of this.children.slice(2)) {
			if (child.type === 'tr' && child.getRowCount()) {
				n--;
				if (n < 0) {
					return child;
				}
			} else if (child.type === 'table-syntax') {
				return child;
			}
		}
		return undefined;
	}

	/**
	 * @returns {TrToken[]}
	 * @complexity `n`
	 */
	getAllRows() {
		return [
			...super.getRowCount() ? [this] : [],
			...this.children.filter(child => child.type === 'tr' && child.getRowCount()),
		];
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @complexity `n`
	 */
	getNthCell(coords) {
		if (coords.row === undefined) {
			coords = this.toRawCoords(coords);
		}
		return coords && this.getNthRow(coords.row).getNthCol(coords.column);
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} stop
	 * @complexity `n`
	 */
	getLayout(stop = {}) {
		const rows = this.getAllRows(),
			{length} = rows,
			/** @type {Layout} */ layout = new Layout(length).fill().map(() => []);
		for (let i = 0; i < length; i++) {
			if (i > (stop.row ?? stop.y)) {
				break;
			}
			const rowLayout = layout[i];
			let j = 0,
				k = 0,
				last;
			for (const cell of rows[i].children.slice(2)) {
				if (cell instanceof TdToken) {
					if (cell.isIndependent()) {
						last = cell.subtype !== 'caption';
					}
					if (last) {
						const /** @type {TableCoords} */ coords = {row: i, column: j},
							{rowspan, colspan} = cell;
						j++;
						while (rowLayout[k]) {
							k++;
						}
						if (i === stop.row && j > stop.column) {
							layout[i][k] = coords;
							return layout;
						}
						for (let y = i; y < Math.min(i + rowspan, length); y++) {
							for (let x = k; x < k + colspan; x++) {
								layout[y][x] = coords;
							}
						}
						k += colspan;
						if (i === stop.y && k > stop.x) {
							return layout;
						}
					}
				} else if (isRowEnd(cell)) {
					break;
				}
			}
		}
		return layout;
	}

	/**
	 * 打印表格布局
	 * @complexity `n`
	 */
	printLayout() {
		this.getLayout().print();
	}

	/**
	 * @param {TableCoords}
	 * @returns {TableRenderedCoords}
	 * @complexity `n`
	 */
	toRenderedCoords({row, column}) {
		if (typeof row !== 'number' || typeof column !== 'number') {
			this.typeError('toRenderedCoords', 'Number');
		}
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x});
	}

	/**
	 * @param {TableRenderedCoords}
	 * @complexity `n`
	 */
	toRawCoords({x, y}) {
		if (typeof x !== 'number' || typeof y !== 'number') {
			this.typeError('toRawCoords', 'Number');
		}
		const rowLayout = this.getLayout({x, y})[y],
			coords = rowLayout?.[x];
		if (coords) {
			return {...coords, start: coords.row === y && rowLayout[x - 1] !== coords};
		} else if (!rowLayout && y === 0) {
			return {row: 0, column: 0, start: true};
		} else if (x === rowLayout?.length) {
			return {row: y, column: (rowLayout.findLast(({row}) => row === y)?.column ?? -1) + 1, start: true};
		}
		return undefined;
	}

	/**
	 * @param {number} y
	 * @complexity `n²`
	 */
	getFullRow(y) {
		if (typeof y !== 'number') {
			this.typeError('getFullRow', 'Number');
		}
		const rows = this.getAllRows();
		return new Map(
			this.getLayout({y})[y]?.map(({row, column}) => [rows[row].getNthCol(column), row === y]),
		);
	}

	/**
	 * @param {number} x
	 * @complexity `n`
	 */
	getFullCol(x) {
		if (typeof x !== 'number') {
			this.typeError('getFullCol', 'Number');
		}
		const layout = this.getLayout(),
			colLayout = layout.map(row => row[x]).filter(Boolean),
			rows = this.getAllRows();
		return new Map(
			colLayout.map(coords => [rows[coords.row].getNthCol(coords.column), layout[coords.row][x - 1] !== coords]),
		);
	}

	/**
	 * @param {number} y
	 * @param {string|Record<string, string|boolean>} attry
	 * @complexity `n²`
	 */
	formatTableRow(y, attr = {}, multiRow = false) {
		format(this.getFullRow(y), attr, multiRow);
	}

	/**
	 * @param {number} x
	 * @param {string|Record<string, string|boolean>} attry
	 * @complexity `n`
	 */
	formatTableCol(x, attr = {}, multiCol = false) {
		format(this.getFullCol(x), attr, multiCol);
	}

	/**
	 * @param {number} y
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 * @complexity `n`
	 */
	fillTableRow(y, inner, subtype = 'td', attr = {}) {
		const rowToken = this.getNthRow(y),
			layout = this.getLayout({y}),
			maxCol = Math.max(...layout.map(row => row.length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		fill(y, rowToken, layout, maxCol, token);
	}

	/**
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 * @complexity `n`
	 */
	fillTable(inner, subtype = 'td', attr = {}) {
		const rowTokens = this.getAllRows(),
			layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (let y = 0; y < rowTokens.length; y++) {
			fill(y, rowTokens[y], layout, maxCol, token);
		}
	}

	/**
	 * @param {string|Token} inner
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string|boolean>} attr
	 * @returns {TdToken}
	 * @complexity `n`
	 */
	insertTableCell(inner, coords, subtype = 'td', attr = {}) {
		if (coords.column === undefined) {
			const {x, y} = coords;
			coords = this.toRawCoords(coords);
			if (!coords?.start) { // eslint-disable-line unicorn/consistent-destructuring
				throw new RangeError(`指定的坐标不是单元格起始点：(${x}, ${y})`);
			}
		}
		const rowToken = this.getNthRow(coords.row ?? 0, true);
		if (rowToken === this) {
			return super.insertTableCell(inner, coords, subtype, attr);
		}
		return rowToken.insertTableCell(inner, coords, subtype, attr);
	}

	/**
	 * 在开头插入一行
	 * @complexity `n`
	 */
	#prependTableRow() {
		const row = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config'))),
			{children} = this,
			[,, plain] = children,
			start = plain?.isPlain() ? 3 : 2,
			/** @type {TdToken[]} */ tdChildren = children.slice(start),
			index = tdChildren.findIndex(({type}) => type !== 'td');
		this.insertAt(row, index === -1 ? -1 : index + start);
		Parser.run(() => {
			for (const cell of tdChildren.slice(0, index === -1 ? undefined : index)) {
				if (cell.subtype !== 'caption') {
					row.appendChild(cell);
				}
			}
		});
		return row;
	}

	/**
	 * @param {number} y
	 * @param {Record<string, string|boolean>} attr
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string|boolean>} attr
	 * @complexity `n`
	 */
	insertTableRow(y, attr = {}, inner = undefined, subtype = 'td', innerAttr = {}) {
		if (typeof attr !== 'object') {
			this.typeError('insertTableRow', 'Object');
		}
		let reference = this.getNthRow(y, false, true);
		/** @type {TrToken & AttributeToken}} */
		const token = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config')));
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		if (reference.type === 'table') { // `row === 0`且表格自身是有效行
			reference = this.#prependTableRow();
		}
		this.insertBefore(token, reference);
		if (inner !== undefined) {
			const td = token.insertTableCell(inner, {column: 0}, subtype, innerAttr),
				/** @type {Set<TableCoords>} */ set = new Set(),
				layout = this.getLayout({y}),
				maxCol = Math.max(...layout.map(row => row.length)),
				rowLayout = layout[y];
			Parser.run(() => {
				for (let i = 0; i < maxCol; i++) {
					const coords = rowLayout[i];
					if (!coords) {
						token.appendChild(td.cloneNode());
					} else if (!set.has(coords)) {
						set.add(coords);
						if (coords.row < y) {
							this.getNthCell(coords).rowspan++;
						}
					}
				}
			});
		}
		return token;
	}

	/**
	 * @param {number} x
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 * @complexity `n²`
	 */
	insertTableCol(x, inner, subtype = 'td', attr = {}) {
		if (typeof x !== 'number') {
			this.typeError('insertTableCol', 'Number');
		}
		const layout = this.getLayout(),
			rowLength = layout.map(({length}) => length),
			minCol = Math.min(...rowLength);
		if (x > minCol) {
			throw new RangeError(`表格第 ${rowLength.indexOf(minCol)} 行仅有 ${minCol} 列！`);
		}
		const token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (let i = 0; i < layout.length; i++) {
			const coords = layout[i][x],
				prevCoords = x === 0 ? true : layout[i][x - 1];
			if (!prevCoords) {
				continue;
			} else if (prevCoords !== coords) {
				const rowToken = this.getNthRow(i);
				rowToken.insertBefore(token.cloneNode(), rowToken.getNthCol(coords.column, true));
			} else if (coords?.row === i) {
				this.getNthCell(coords).colspan++;
			}
		}
	}

	/**
	 * @param {number} y
	 * @complexity `n²`
	 */
	removeTableRow(y) {
		const rows = this.getAllRows(),
			layout = this.getLayout(),
			rowLayout = layout[y],
			/** @type {Set<TableCoords>} */ set = new Set();
		for (let x = rowLayout.length - 1; x >= 0; x--) {
			const coords = rowLayout[x];
			if (set.has(coords)) {
				continue;
			}
			set.add(coords);
			const token = rows[coords.row].getNthCol(coords.column);
			let {rowspan} = token;
			if (rowspan > 1) {
				token.rowspan = --rowspan;
				if (coords.row === y) {
					const {colspan, subtype} = token,
						attr = token.getAttr();
					for (let i = y + 1; rowspan && i < rows.length; i++, rowspan--) {
						const {column} = layout[i].slice(x + colspan).find(({row}) => row === i) ?? {};
						if (column !== undefined) {
							rows[i].insertTableCell('', {column}, subtype, {...attr, rowspan});
							break;
						}
					}
				}
			}
		}
		const rowToken = rows[y].type === 'table' ? this.#prependTableRow() : rows[y];
		rowToken.remove();
		return rowToken;
	}

	/**
	 * @param {number} x
	 * @complexity `n²`
	 */
	removeTableCol(x) {
		for (const [token, start] of this.getFullCol(x)) {
			const {colspan, lastElementChild} = token;
			if (colspan > 1) {
				token.colspan = colspan - 1;
				if (start) {
					lastElementChild.replaceChildren();
				}
			} else {
				token.remove();
			}
		}
	}

	/**
	 * @param {[number, number]} xlim
	 * @param {[number, number]} ylim
	 * @complexity `n²`
	 */
	mergeCells(xlim, ylim) {
		if ([...xlim, ...ylim].some(arg => typeof arg !== 'number')) {
			this.typeError('mergeCells', 'Number');
		}
		const layout = this.getLayout(),
			maxCol = Math.max(...layout.map(({length}) => length));
		xlim = xlim.map(x => x < 0 ? x + maxCol : x);
		ylim = ylim.map(y => y < 0 ? y + layout.length : y);
		const [xmin, xmax] = xlim.sort(),
			[ymin, ymax] = ylim.sort(),
			set = new Set(layout.slice(ymin, ymax).flatMap(rowLayout => rowLayout.slice(xmin, xmax)));
		if ([...layout[ymin - 1] ?? [], ...layout[ymax] ?? []].some(coords => set.has(coords))
			|| layout.some(rowLayout => set.has(rowLayout[xmin - 1]) || set.has(rowLayout[xmax]))
		) {
			throw new RangeError(`待合并区域与外侧区域有重叠！`);
		}
		const corner = layout[ymin][xmin],
			rows = this.getAllRows(),
			cornerCell = rows[corner.row].getNthCol(corner.column);
		cornerCell.rowspan = ymax - ymin;
		cornerCell.colspan = xmax - xmin;
		set.delete(corner);
		for (const token of [...set].map(({row, column}) => rows[row].getNthCol(column))) {
			token.remove();
		}
		return cornerCell;
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @param {Set<'rowspan'|'colspan'>} dirs
	 * @complexity `n²`
	 */
	#split(coords, dirs) {
		const cell = this.getNthCell(coords),
			attr = cell.getAttr(),
			{subtype} = cell;
		attr.rowspan = Number(attr.rowspan) || 1;
		attr.colspan = Number(attr.colspan) || 1;
		for (const dir of dirs) {
			if (attr[dir] === 1) {
				dirs.delete(dir);
			}
		}
		if (dirs.size === 0) {
			return;
		}
		let {x, y} = coords;
		if (x !== undefined) {
			coords = this.toRawCoords(coords);
		}
		if (coords.start === false || x === undefined) { // eslint-disable-line unicorn/consistent-destructuring
			({x, y} = this.toRenderedCoords(coords));
		}
		const splitting = {rowspan: 1, colspan: 1};
		for (const dir of dirs) {
			cell.setAttr(dir, 1);
			splitting[dir] = attr[dir];
			delete attr[dir];
		}
		for (let j = y; j < y + splitting.rowspan; j++) {
			for (let i = x; i < x + splitting.colspan; i++) {
				if (i > x || j > y) {
					try {
						this.insertTableCell('', {x: i, y: j}, subtype, attr);
					} catch (e) {
						if (!(e instanceof RangeError) || !e.message.startsWith('指定的坐标不是单元格起始点：')) {
							throw e;
						}
						break;
					}
				}
			}
		}
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @complexity `n²`
	 */
	splitIntoRows(coords) {
		this.#split(coords, new Set(['rowspan']));
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @complexity `n²`
	 */
	splitIntoCols(coords) {
		this.#split(coords, new Set(['colspan']));
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @complexity `n²`
	 */
	splitIntoCells(coords) {
		this.#split(coords, new Set(['rowspan', 'colspan']));
	}

	/**
	 * 复制一行并插入该行之前
	 * @param {number} row
	 * @complexity `n²`
	 */
	replicateTableRow(row) {
		let rowToken = this.getNthRow(row);
		if (rowToken.type === 'table') {
			rowToken = this.#prependTableRow();
		}
		const /** @type {TrToken} */ replicated = this.insertBefore(rowToken.cloneNode(), rowToken);
		for (const [token, start] of this.getFullRow(row)) {
			if (start) {
				token.rowspan = 1;
			} else {
				token.rowspan++;
			}
		}
		return replicated;
	}

	/**
	 * 复制一列并插入该列之前
	 * @param {number} x
	 * @complexity `n`
	 */
	replicateTableCol(x) {
		const /** @type {TdToken[]} */ replicated = [];
		for (const [token, start] of this.getFullCol(x)) {
			if (start) {
				const newToken = token.cloneNode();
				newToken.colspan = 1;
				token.before(newToken);
				replicated.push(newToken);
			} else {
				token.colspan++;
			}
		}
		return replicated;
	}

	/**
	 * @param {number} y
	 * @param {number} before
	 * @complexity `n²`
	 */
	moveTableRowBefore(y, before) {
		if (typeof y !== 'number' || typeof before !== 'number') {
			this.typeError('moveTableRowBefore', 'Number');
		}
		const layout = this.getLayout();

		/**
		 * @type {(i: number) => number[]}
		 * @complexity `n`
		 */
		const occupied = i => layout[i].map(({row}, j) => row === i ? j : null).filter(j => j !== null);
		try {
			assert.deepStrictEqual(occupied(y), occupied(before));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(`第 ${y} 行与第 ${before} 行的构造不同，无法移动！`);
			}
			throw e;
		}
		const rowToken = this.removeTableRow(y);
		for (const coords of layout[before]) {
			if (coords.row < before) {
				this.getNthCell(coords).rowspan++;
			}
		}
		let beforeToken = this.getNthRow(before);
		if (beforeToken.type === 'table') {
			beforeToken = this.#prependTableRow();
		}
		this.insertBefore(rowToken, beforeToken);
		return rowToken;
	}

	/**
	 * @param {number} y
	 * @param {number} after
	 * @complexity `n²`
	 */
	moveTableRowAfter(y, after) {
		if (typeof y !== 'number' || typeof after !== 'number') {
			this.typeError('moveTableRowAfter', 'Number');
		}
		const layout = this.getLayout(),
			afterToken = this.getNthRow(after),
			/** @type {TdToken[]} */
			cells = afterToken.children.filter(child => child instanceof TdToken && child.subtype !== 'caption');

		/**
		 * @type {(i: number, oneRow?: boolean) => number[]}
		 * @complexity `n`
		 */
		const occupied = (i, oneRow = false) => layout[i].map(
			({row, column}, j) => row === i && (!oneRow || cells[column].rowspan === 1) ? j : null,
		).filter(j => j !== null);
		try {
			assert.deepStrictEqual(occupied(y), occupied(after, true));
		} catch (e) {
			if (e instanceof assert.AssertionError) {
				throw new RangeError(`第 ${y} 行与第 ${after} 行的构造不同，无法移动！`);
			}
			throw e;
		}
		const rowToken = this.removeTableRow(y);
		for (const coords of layout[after]) {
			if (coords.row < after) {
				this.getNthCell(coords).rowspan++;
			} else {
				const cell = cells[coords.column],
					{rowspan} = cell;
				if (rowspan > 1) {
					cell.rowspan = rowspan + 1;
				}
			}
		}
		if (afterToken === this) {
			const index = this.childNodes.slice(2).findIndex(isRowEnd);
			this.insertAt(rowToken, index + 2);
		} else {
			this.insertBefore(rowToken, afterToken);
		}
		return rowToken;
	}

	/**
	 * @param {number} x
	 * @param {number} reference
	 * @complexity `n`
	 */
	#moveCol(x, reference, after = false) {
		if (typeof x !== 'number' || typeof reference !== 'number') {
			this.typeError(`moveTableCol${after ? 'After' : 'Before'}`, 'Number');
		}
		const layout = this.getLayout();
		if (layout.some(rowLayout => isStartCol(rowLayout, x) !== isStartCol(rowLayout, reference, after))) {
			throw new RangeError(`第 ${x} 列与第 ${reference} 列的构造不同，无法移动！`);
		}
		const /** @type {Set<TableCoords>} */ setX = new Set(),
			/** @type {Set<TableCoords>} */ setRef = new Set(),
			rows = this.getAllRows();
		for (let i = 0; i < layout.length; i++) {
			const rowLayout = layout[i],
				coords = rowLayout[x],
				refCoords = rowLayout[reference],
				start = isStartCol(rowLayout, x);
			if (refCoords && !start && !setRef.has(refCoords)) {
				setRef.add(refCoords);
				rows[refCoords.row].getNthCol(refCoords.column).colspan++;
			}
			if (coords && !setX.has(coords)) {
				setX.add(coords);
				const rowToken = rows[i];
				let token = rowToken.getNthCol(coords.column);
				const {colspan} = token;
				if (colspan > 1) {
					token.colspan = colspan - 1;
					if (start) {
						const original = token;
						token = token.cloneNode();
						original.lastElementChild.replaceChildren();
						token.colspan = 1;
					}
				}
				if (start) {
					const col = rowLayout.slice(reference + Number(after)).find(({row}) => row === i)?.column;
					rowToken.insertBefore(
						token, col === undefined && rowToken.type === 'table'
							? rowToken.children.slice(2).find(isRowEnd)
							: col !== undefined && rowToken.getNthCol(col),
					);
				}
			}
		}
	}

	/**
	 * @param {number} x
	 * @param {number} before
	 * @complexity `n`
	 */
	moveTableColBefore(x, before) {
		this.#moveCol(x, before);
	}

	/**
	 * @param {number} x
	 * @param {number} after
	 * @complexity `n`
	 */
	moveTableColAfter(x, after) {
		this.#moveCol(x, after, true);
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
