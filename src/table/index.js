'use strict';

const {generateForChild} = require('../../util/lint'),
	{noWrap} = require('../../util/string'),
	{isPlainObject} = require('../../util/base'),
	assert = require('assert/strict'),
	Parser = require('../..'),
	Token = require('..'),
	TrToken = require('./tr'),
	TdToken = require('./td'),
	SyntaxToken = require('../syntax');

const openingPattern = /^(?:\{\||\{\{\{\s*!\s*\}\}|\{\{\s*\(!\s*\}\})$/u,
	closingPattern = /^\n[^\S\n]*(?:\|\}|\{\{\s*!\s*\}\}\}|\{\{\s*!\)\s*\}\})$/u;

/**
 * 比较两个表格坐标
 * @param {TableCoords} coords1 坐标1
 * @param {TableCoords} coords2 坐标2
 */
const cmpCoords = (coords1, coords2) => {
	const diff = coords1.row - coords2.row;
	return diff === 0 ? coords1.column - coords2.column : diff;
};

/**
 * 是否是行尾
 * @param {Token} cell 表格单元格
 */
const isRowEnd = ({type}) => type === 'tr' || type === 'table-syntax';

/**
 * 是否是合并单元格的第一列
 * @param {TableCoords[]} rowLayout 行布局
 * @param {number} i 单元格序号
 * @param {boolean} oneCol 是否仅有一列
 */
const isStartCol = (rowLayout, i, oneCol = false) => {
	const coords = rowLayout[i];
	return rowLayout[i - 1] !== coords && (!oneCol || rowLayout[i + 1] !== coords);
};

/**
 * 设置表格格式
 * @param {Map<TdToken, boolean>} cells 单元格
 * @param {string|Record<string, string|boolean>} attr 属性
 * @param {boolean} multi 是否对所有单元格设置，或是仅对行首单元格设置
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
 * 填补缺失单元格
 * @param {number} y 行号
 * @param {TrToken} rowToken 表格行
 * @param {TableCoords[][]} layout 表格布局
 * @param {number} maxCol 最大列数
 * @param {Token} token 待填充的单元格
 * @complexity `n`
 */
const fill = (y, rowToken, layout, maxCol, token) => {
	const rowLayout = layout[y],
		{childNodes} = rowToken,
		lastIndex = childNodes.findLastIndex(child => child instanceof TdToken && child.subtype !== 'caption') + 1
			|| undefined;
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
				const bit = (vBorderTop[j] << 3) + (vBorderBottom[j] << 0) + (hBorder[j - 1] << 2) + (hBorder[j] << 1);
				out += `${border[bit]}${hBorder[j] ? '─' : ' '}`;
			}
			out += '\n';
		}
		console.log(out.slice(0, -1));
	}
}

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributesToken, ?Token, ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	/** 表格是否闭合 */
	get closed() {
		return this.lastChild.type === 'table-syntax';
	}

	set closed(closed) {
		if (closed === true && !this.closed) {
			this.close(this.closest('parameter') ? '\n{{!)}}' : '\n|}');
		}
	}

	/**
	 * @param {string} syntax 表格语法
	 * @param {string} attr 表格属性
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, openingPattern);
		this.setAttribute('acceptable', {
			Token: 2, SyntaxToken: [0, -1], AttributesToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @override
	 * @template {TrToken|SyntaxToken} T
	 * @param {T} token 待插入的子节点
	 * @param {number} i 插入位置
	 * @returns {T}
	 * @complexity `n`
	 * @throws `SyntaxError` 表格的闭合部分非法
	 */
	insertAt(token, i = this.length) {
		const previous = this.childNodes.at(i - 1);
		if (token.type === 'td' && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.insertAt(token);
		} else if (i > 0 && i === this.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(String(token))}`);
		}
		return super.insertAt(token, i);
	}

	/**
	 * @override
	 * @param {number} start 起始位置
	 */
	lint(start = 0) {
		const errors = super.lint(start);
		if (!this.closed) {
			const {firstChild, lastChild: tr} = this,
				{lastChild: td} = tr,
				error = generateForChild(firstChild, {start}, '未闭合的表格');
			errors.push({...error, excerpt: String(td?.type === 'td' ? td : tr).slice(0, 50)});
		}
		return errors;
	}

	/**
	 * 闭合表格语法
	 * @complexity `n`
	 * @param {string} syntax 表格结尾语法
	 * @throws `SyntaxError` 表格的闭合部分不符合语法
	 */
	close(syntax = '\n|}', halfParsed = false) {
		halfParsed &&= Parser.running;
		const config = this.getAttribute('config'),
			accum = this.getAttribute('accum'),
			inner = !halfParsed && Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastChild} = this;
		if (!halfParsed && !closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${noWrap(syntax)}`);
		} else if (lastChild instanceof SyntaxToken) {
			lastChild.replaceChildren(...inner.childNodes);
		} else {
			super.insertAt(Parser.run(() => {
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
	 * @override
	 * @returns {number}
	 * @complexity `n`
	 */
	getRowCount() {
		return super.getRowCount()
			+ this.childNodes.filter(child => child.type === 'tr' && child.getRowCount()).length;
	}

	/** @override */
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
	 * 获取第n行
	 * @param {number} n 行号
	 * @param {boolean} force 是否将表格自身视为第一行
	 * @param {boolean} insert 是否用于判断插入新行的位置
	 * @returns {TrToken}
	 * @complexity `n`
	 * @throws `RangeError` 不存在该行
	 */
	getNthRow(n, force, insert) {
		if (!Number.isInteger(n)) {
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
		for (const child of this.childNodes.slice(2)) {
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
	 * 获取所有行
	 * @returns {TrToken[]}
	 * @complexity `n`
	 */
	getAllRows() {
		return [
			...super.getRowCount() ? [this] : [],
			...this.childNodes.filter(child => child.type === 'tr' && child.getRowCount()),
		];
	}

	/**
	 * 获取指定坐标的单元格
	 * @param {TableCoords & TableRenderedCoords} coords 表格坐标
	 * @complexity `n`
	 */
	getNthCell(coords) {
		if (coords.row === undefined) {
			coords = this.toRawCoords(coords);
		}
		return coords && this.getNthRow(coords.row).getNthCol(coords.column);
	}

	/**
	 * 获取表格布局
	 * @param {TableCoords & TableRenderedCoords} stop 中止条件
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
			for (const cell of rows[i].childNodes.slice(2)) {
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
	 * 转换为渲染后的表格坐标
	 * @param {TableCoords} coord wikitext中的表格坐标
	 * @returns {TableRenderedCoords}
	 * @complexity `n`
	 */
	toRenderedCoords({row, column}) {
		if (!Number.isInteger(row) || !Number.isInteger(column)) {
			this.typeError('toRenderedCoords', 'Number');
		}
		const rowLayout = this.getLayout({row, column})[row],
			x = rowLayout?.findIndex(coords => cmpCoords(coords, {row, column}) === 0);
		return rowLayout && (x === -1 ? undefined : {y: row, x});
	}

	/**
	 * 转换为wikitext中的表格坐标
	 * @param {TableRenderedCoords} coord 渲染后的表格坐标
	 * @complexity `n`
	 */
	toRawCoords({x, y}) {
		if (!Number.isInteger(x) || !Number.isInteger(y)) {
			this.typeError('toRawCoords', 'Number');
		}
		const rowLayout = this.getLayout({x, y})[y],
			coords = rowLayout?.[x];
		if (coords) {
			return {...coords, start: coords.row === y && rowLayout[x - 1] !== coords};
		} else if (rowLayout || y > 0) {
			return x === rowLayout?.length
				? {row: y, column: (rowLayout.findLast(({row}) => row === y)?.column ?? -1) + 1, start: true}
				: undefined;
		}
		return {row: 0, column: 0, start: true};
	}

	/**
	 * 获取完整行
	 * @param {number} y 行号
	 * @complexity `n²`
	 */
	getFullRow(y) {
		if (!Number.isInteger(y)) {
			this.typeError('getFullRow', 'Number');
		}
		const rows = this.getAllRows();
		return new Map(
			this.getLayout({y})[y]?.map(({row, column}) => [rows[row].getNthCol(column), row === y]),
		);
	}

	/**
	 * 获取完整列
	 * @param {number} x 列号
	 * @complexity `n`
	 */
	getFullCol(x) {
		if (!Number.isInteger(x)) {
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
	 * 设置行格式
	 * @param {number} y 行号
	 * @param {string|Record<string, string|boolean>} attr 表格属性
	 * @param {boolean} multiRow 是否对所有单元格设置，或是仅对行首单元格设置
	 * @complexity `n²`
	 */
	formatTableRow(y, attr = {}, multiRow = false) {
		format(this.getFullRow(y), attr, multiRow);
	}

	/**
	 * 设置列格式
	 * @param {number} x 列号
	 * @param {string|Record<string, string|boolean>} attr 表格属性
	 * @param {boolean} multiCol 是否对所有单元格设置，或是仅对行首单元格设置
	 * @complexity `n`
	 */
	formatTableCol(x, attr = {}, multiCol = false) {
		format(this.getFullCol(x), attr, multiCol);
	}

	/**
	 * 填补表格行
	 * @param {number} y 行号
	 * @param {string|Token} inner 填充内容
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string>} attr 表格属性
	 * @complexity `n`
	 */
	fillTableRow(y, inner, subtype = 'td', attr = {}) {
		const rowToken = this.getNthRow(y),
			layout = this.getLayout({y}),
			maxCol = Math.max(...layout.map(({length}) => length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		fill(y, rowToken, layout, maxCol, token);
	}

	/**
	 * 填补表格
	 * @param {string|Token} inner 填充内容
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string>} attr 表格属性
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
	 * @override
	 * @param {string|Token} inner 单元格内部wikitext
	 * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string|boolean>} attr 单元格属性
	 * @returns {TdToken}
	 * @complexity `n`
	 * @throws `RangeError` 指定的坐标不是单元格起始点
	 */
	insertTableCell(inner, coords, subtype = 'td', attr = {}) {
		if (coords.column === undefined) {
			const {x, y} = coords;
			coords = this.toRawCoords(coords);
			if (!coords?.start) {
				throw new RangeError(`指定的坐标不是单元格起始点：(${x}, ${y})`);
			}
		}
		const rowToken = this.getNthRow(coords.row ?? 0, true);
		return rowToken === this
			? super.insertTableCell(inner, coords, subtype, attr)
			: rowToken.insertTableCell(inner, coords, subtype, attr);
	}

	/**
	 * 在开头插入一行
	 * @complexity `n`
	 */
	#prependTableRow() {
		const row = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config'))),
			{childNodes} = this,
			[,, plain] = childNodes,
			start = plain?.constructor === Token ? 3 : 2,
			/** @type {TdToken[]} */ tdChildren = childNodes.slice(start),
			index = tdChildren.findIndex(({type}) => type !== 'td');
		this.insertAt(row, index === -1 ? -1 : index + start);
		Parser.run(() => {
			for (const cell of tdChildren.slice(0, index === -1 ? undefined : index)) {
				if (cell.subtype !== 'caption') {
					row.insertAt(cell);
				}
			}
		});
		return row;
	}

	/**
	 * 插入表格行
	 * @param {number} y 行号
	 * @param {Record<string, string|boolean>} attr 表格行属性
	 * @param {string|Token} inner 内部wikitext
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string|boolean>} innerAttr 单元格属性
	 * @complexity `n`
	 */
	insertTableRow(y, attr = {}, inner = undefined, subtype = 'td', innerAttr = {}) {
		if (!isPlainObject(attr)) {
			this.typeError('insertTableRow', 'Object');
		}
		let reference = this.getNthRow(y, false, true);
		const AttributesToken = require('../attributes');
		/** @type {TrToken & AttributesToken}} */
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
				/** @type {WeakSet<TableCoords>} */ set = new WeakSet(),
				layout = this.getLayout({y}),
				maxCol = Math.max(...layout.map(({length}) => length)),
				rowLayout = layout[y];
			Parser.run(() => {
				for (let i = 0; i < maxCol; i++) {
					const coords = rowLayout[i];
					if (!coords) {
						token.insertAt(td.cloneNode());
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
	 * 插入表格列
	 * @param {number} x 列号
	 * @param {string|Token} inner 内部wikitext
	 * @param {'td'|'th'|'caption'} subtype 单元格类型
	 * @param {Record<string, string>} attr 单元格属性
	 * @complexity `n²`
	 * @throws `RangeError` 列号过大
	 */
	insertTableCol(x, inner, subtype = 'td', attr = {}) {
		if (!Number.isInteger(x)) {
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
	 * 移除表格行
	 * @param {number} y 行号
	 * @complexity `n²`
	 */
	removeTableRow(y) {
		const rows = this.getAllRows(),
			layout = this.getLayout(),
			rowLayout = layout[y],
			/** @type {WeakSet<TableCoords>} */ set = new WeakSet();
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
						attr = token.getAttrs();
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
	 * 移除表格列
	 * @param {number} x 列号
	 * @complexity `n²`
	 */
	removeTableCol(x) {
		for (const [token, start] of this.getFullCol(x)) {
			const {colspan, lastChild} = token;
			if (colspan > 1) {
				token.colspan = colspan - 1;
				if (start) {
					lastChild.replaceChildren();
				}
			} else {
				token.remove();
			}
		}
	}

	/**
	 * 合并单元格
	 * @param {[number, number]} xlim 列范围
	 * @param {[number, number]} ylim 行范围
	 * @complexity `n²`
	 * @throws `RangeError` 待合并区域与外侧区域有重叠
	 */
	mergeCells(xlim, ylim) {
		if (![...xlim, ...ylim].every(Number.isInteger)) {
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
			throw new RangeError('待合并区域与外侧区域有重叠！');
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
	 * 分裂单元格
	 * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
	 * @param {Set<'rowspan'|'colspan'>} dirs 分裂方向
	 * @complexity `n²`
	 * @throws `RangeError` 指定的坐标不是单元格起始点
	 */
	#split(coords, dirs) {
		const cell = this.getNthCell(coords),
			attr = cell.getAttrs(),
			{subtype} = cell;
		attr.rowspan ||= 1;
		attr.colspan ||= 1;
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
		if (coords.start === false || x === undefined) {
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
						if (e instanceof RangeError && e.message.startsWith('指定的坐标不是单元格起始点：')) {
							break;
						}
						throw e;
					}
				}
			}
		}
	}

	/**
	 * 分裂成多行
	 * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
	 * @complexity `n²`
	 */
	splitIntoRows(coords) {
		this.#split(coords, new Set(['rowspan']));
	}

	/**
	 * 分裂成多列
	 * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
	 * @complexity `n²`
	 */
	splitIntoCols(coords) {
		this.#split(coords, new Set(['colspan']));
	}

	/**
	 * 分裂成单元格
	 * @param {TableCoords & TableRenderedCoords} coords 单元格坐标
	 * @complexity `n²`
	 */
	splitIntoCells(coords) {
		this.#split(coords, new Set(['rowspan', 'colspan']));
	}

	/**
	 * 复制一行并插入该行之前
	 * @param {number} row 行号
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
	 * @param {number} x 列号
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
	 * 移动表格行
	 * @param {number} y 行号
	 * @param {number} before 新位置
	 * @complexity `n²`
	 * @throws `RangeError` 无法移动
	 */
	moveTableRowBefore(y, before) {
		if (!Number.isInteger(y) || !Number.isInteger(before)) {
			this.typeError('moveTableRowBefore', 'Number');
		}
		const layout = this.getLayout();

		/**
		 * @type {(i: number) => number[]}
		 * @complexity `n`
		 */
		const occupied = i => layout[i].map(({row}, j) => row === i ? j : undefined).filter(j => j !== undefined);
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
	 * 移动表格行
	 * @param {number} y 行号
	 * @param {number} after 新位置
	 * @complexity `n²`
	 * @throws `RangeError` 无法移动
	 */
	moveTableRowAfter(y, after) {
		if (!Number.isInteger(y) || !Number.isInteger(after)) {
			this.typeError('moveTableRowAfter', 'Number');
		}
		const layout = this.getLayout(),
			afterToken = this.getNthRow(after),
			/** @type {TdToken[]} */
			cells = afterToken.childNodes.filter(child => child instanceof TdToken && child.subtype !== 'caption');

		/**
		 * @type {(i: number, oneRow?: boolean) => number[]}
		 * @complexity `n`
		 */
		const occupied = (i, oneRow = false) => layout[i].map(
			({row, column}, j) => row === i && (!oneRow || cells[column].rowspan === 1) ? j : undefined,
		).filter(j => j !== undefined);
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
	 * 移动表格列
	 * @param {number} x 列号
	 * @param {number} reference 新位置
	 * @param {boolean} after 在新位置之后或之前
	 * @complexity `n`
	 * @throws `RangeError` 无法移动
	 */
	#moveCol(x, reference, after = false) {
		if (!Number.isInteger(x) || !Number.isInteger(reference)) {
			this.typeError(`moveTableCol${after ? 'After' : 'Before'}`, 'Number');
		}
		const layout = this.getLayout();
		if (layout.some(rowLayout => isStartCol(rowLayout, x) !== isStartCol(rowLayout, reference, after))) {
			throw new RangeError(`第 ${x} 列与第 ${reference} 列的构造不同，无法移动！`);
		}
		const /** @type {WeakSet<TableCoords>} */ setX = new WeakSet(),
			/** @type {WeakSet<TableCoords>} */ setRef = new WeakSet(),
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
						original.lastChild.replaceChildren();
						token.colspan = 1;
					}
				}
				if (start) {
					const col = rowLayout.slice(reference + Number(after)).find(({row}) => row === i)?.column;
					rowToken.insertBefore(
						token, col === undefined && rowToken.type === 'table'
							? rowToken.childNodes.slice(2).find(isRowEnd)
							: col !== undefined && rowToken.getNthCol(col),
					);
				}
			}
		}
	}

	/**
	 * 移动表格列
	 * @param {number} x 列号
	 * @param {number} before 新位置
	 * @complexity `n`
	 */
	moveTableColBefore(x, before) {
		this.#moveCol(x, before);
	}

	/**
	 * 移动表格列
	 * @param {number} x 列号
	 * @param {number} after 新位置
	 * @complexity `n`
	 */
	moveTableColAfter(x, after) {
		this.#moveCol(x, after, true);
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
