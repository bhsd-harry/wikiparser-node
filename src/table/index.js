'use strict';

const {typeError} = require('../../util/debug'),
	/** @type {Parser} */ Parser = require('../..'),
	Token = require('..'), // eslint-disable-line no-unused-vars
	TrToken = require('./tr'),
	TdToken = require('./td'),
	SyntaxToken = require('../syntax'),
	AttributeToken = require('../attribute'); // eslint-disable-line no-unused-vars

/**
 * @param {TableCoords} coords1
 * @param {TableCoords} coords2
 */
const cmpCoords = (coords1, coords2) => {
	const diff = coords1?.row - coords2?.row;
	return diff === 0 ? coords1?.column - coords2?.column : diff;
};

/**
 * 表格
 * @classdesc `{childNodes: [SyntaxToken, AttributeToken, ?(string|Token), ...TdToken, ...TrToken, ?SyntaxToken]}`
 */
class TableToken extends TrToken {
	type = 'table';

	static openingPattern = /^(?:{\||{{{\s*!\s*}}|{{\s*\(!\s*}})$/;
	static closingPattern = /^\n[^\S\n]*(?:\|}|{{\s*!\s*}}}|{{\s*!\)\s*}})$/;

	/**
	 * @param {string} syntax
	 * @param {accum} accum
	 */
	constructor(syntax, attr = '', config = Parser.getConfig(), accum = []) {
		super(syntax, attr, config, accum, TableToken.openingPattern);
		this.setAttribute('acceptable', {
			String: 2, Token: 2, SyntaxToken: [0, -1], AttributeToken: 1, TdToken: '2:', TrToken: '2:',
		});
	}

	/**
	 * @template {string|Token} T
	 * @param {T} token
	 * @returns {T}
	 * @complexity `n`
	 */
	insertAt(token, i = this.childNodes.length) {
		const previous = this.childNodes.at(i - 1),
			{closingPattern} = TableToken;
		if (token instanceof TrToken && token.type === 'td' && previous instanceof TrToken && previous.type === 'tr') {
			Parser.warn('改为将单元格插入当前行。');
			return previous.appendChild(token);
		} else if (!Parser.running && i === this.childNodes.length && token instanceof SyntaxToken
			&& (token.getAttribute('pattern') !== closingPattern || !closingPattern.test(token.text()))
		) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${token.toString().replaceAll('\n', '\\n')}`);
		}
		return super.insertAt(token, i);
	}

	/** @complexity `n` */
	close(syntax = '\n|}') {
		const config = this.getAttribute('config'),
			inner = Parser.parse(syntax, this.getAttribute('include'), 2, config),
			{lastElementChild} = this;
		if (!TableToken.closingPattern.test(inner.text())) {
			throw new SyntaxError(`表格的闭合部分不符合语法！${syntax.replaceAll('\n', '\\n')}`);
		} else if (lastElementChild instanceof SyntaxToken) {
			lastElementChild.replaceChildren(...inner.childNodes);
		} else {
			this.appendChild(Parser.run(() => {
				const token = new SyntaxToken(undefined, TableToken.closingPattern, 'table-syntax', config, [], {
					'Stage-1': ':', '!ExtToken': '', TranscludeToken: ':',
				});
				token.replaceChildren(...inner.childNodes);
				return token;
			}));
		}
	}

	/**
	 * @returns {number}
	 * @complexity `n`
	 */
	getRowCount() {
		return super.getRowCount()
			+ this.children.filter(child => child.type === 'tr' && child.getRowCount()).length;
	}

	/**
	 * @param {number} n
	 * @complexity `n`
	 */
	getNthRow(n, force = false, insert = false) {
		if (typeof n !== 'number') {
			typeError(this, 'getNthRow', 'Number');
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
	}

	/** @complexity `n` */
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
			/** @type {TableCoords[][]} */ layout = rows.map(() => []);
		for (const [i, rowToken] of rows.entries()) {
			if (i > stop.row ?? stop.y) {
				break;
			}
			const rowLayout = layout[i];
			let j = 0,
				k = 0,
				last;
			for (const cell of rowToken.children.slice(2)) {
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
				} else if (['tr', 'table-syntax'].includes(cell.type)) {
					break;
				}
			}
		}
		return layout;
	}

	/**
	 * @param {TableCoords}
	 * @returns {TableRenderedCoords}
	 * @complexity `n`
	 */
	toRenderedCoords({row, column}) {
		if (typeof row !== 'number' || typeof column !== 'number') {
			typeError(this, 'toRenderedCoords', 'Number');
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
			typeError(this, 'toRawCoords', 'Number');
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
	}

	/**
	 * @param {number} y
	 * @complexity `n²`
	 */
	getFullRow(y) {
		if (typeof y !== 'number') {
			typeError(this, 'getFullRow', 'Number');
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
			typeError(this, 'getFullCol', 'Number');
		}
		const layout = this.getLayout(),
			colLayout = layout.map(row => row[x]).filter(coords => coords),
			rows = this.getAllRows();
		return new Map(
			colLayout.map(coords => [rows[coords.row].getNthCol(coords.column), layout[coords.row][x - 1] !== coords]),
		);
	}

	/**
	 * @param {Map<TdToken, boolean>} cells
	 * @param {string|Record<string, string|boolean>} attr
	 * @complexity `n`
	 */
	#format(cells, attr = {}, multi = false) {
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
	}

	/**
	 * @param {number} y
	 * @param {string|Record<string, string|boolean>} attry
	 * @complexity `n²`
	 */
	formatTableRow(y, attr = {}, multiRow = false) {
		this.#format(this.getFullRow(y), attr, multiRow);
	}

	/**
	 * @param {number} x
	 * @param {string|Record<string, string|boolean>} attry
	 * @complexity `n`
	 */
	formatTableCol(x, attr = {}, multiCol = false) {
		this.#format(this.getFullCol(x), attr, multiCol);
	}

	/**
	 * @param {number} y
	 * @param {TrToken} rowToken
	 * @param {TableCoords[][]} layout
	 * @param {number} maxCol
	 * @param {Token} token
	 * @complexity `n²`
	 */
	#fill(y, rowToken, layout, maxCol, token) {
		const rowLayout = layout[y],
			{childNodes} = rowToken;
		let lastIndex = childNodes.findLastIndex(child => child instanceof TdToken && child.subtype !== 'caption');
		lastIndex = lastIndex === -1 ? undefined : lastIndex - childNodes.length;
		for (let i = 0; i < maxCol; i++) {
			if (!rowLayout[i]) {
				rowToken.insertAt(token.cloneNode(), lastIndex);
			}
		}
	}

	/**
	 * @param {number} y
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 * @complexity `n²`
	 */
	fillTableRow(y, inner, subtype = 'td', attr = {}) {
		const rowToken = this.getNthRow(y),
			layout = this.getLayout({y}),
			maxCol = Math.max(...layout.map(row => row.length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		this.#fill(y, rowToken, layout, maxCol, token);
	}

	/**
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string>} attr
	 * @complexity `n²`
	 */
	fillTable(inner, subtype = 'td', attr = {}) {
		const rowTokens = this.getAllRows(),
			layout = this.getLayout(),
			maxCol = Math.max(...layout.map(row => row.length)),
			token = TdToken.create(inner, subtype, attr, this.getAttribute('include'), this.getAttribute('config'));
		for (const [y, rowToken] of rowTokens.entries()) {
			this.#fill(y, rowToken, layout, maxCol, token);
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
			if (!coords?.start) {
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
	 * @param {number} y
	 * @param {Record<string, string|boolean>} attr
	 * @param {string|Token} inner
	 * @param {'td'|'th'|'caption'} subtype
	 * @param {Record<string, string|boolean>} attr
	 * @complexity `n²`
	 */
	insertTableRow(y, attr = {}, inner = undefined, subtype = 'td', innerAttr = {}) {
		if (typeof attr !== 'object') {
			typeError(this, 'insertTableRow', 'Object');
		}
		let reference = this.getNthRow(y, false, true);
		/** @type {TrToken & AttributeToken}} */
		const token = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config')));
		for (const [k, v] of Object.entries(attr)) {
			token.setAttr(k, v);
		}
		if (reference === this) { // `row === 0`且表格自身是有效行
			reference = Parser.run(() => new TrToken('\n|-', undefined, this.getAttribute('config')));
			const {childNodes} = this,
				[,, plain] = childNodes,
				start = typeof plain === 'string' || plain.isPlain() ? 3 : 2,
				/** @type {TdToken[]} */ children = childNodes.slice(start),
				index = children.findIndex(({type}) => type !== 'td');
			this.insertAt(reference, index === -1 ? -1 : index + start);
			for (const cell of children.slice(0, index === -1 ? undefined : index)) {
				if (cell.subtype !== 'caption') {
					reference.appendChild(cell);
				}
			}
		}
		this.insertBefore(token, reference);
		if (inner !== undefined) {
			const td = token.insertTableCell(inner, {column: 0}, subtype, innerAttr),
				/** @type {Set<TableCoords>} */ set = new Set(),
				layout = this.getLayout({y}),
				maxCol = Math.max(...layout.map(row => row.length)),
				rowLayout = layout[y];
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
			typeError(this, 'insertTableCol', 'Number');
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
			isSelf = rows[y] === this,
			layout = this.getLayout(),
			/** @type {Set<TableCoords>} */ set = new Set();
		for (const [x, coords] of [...layout[y].entries()].reverse()) {
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
						if (column) {
							rows[i].insertTableCell('', {column}, subtype, {...attr, rowspan});
							break;
						}
					}
				}
			} else if (isSelf) {
				token.remove();
			}
		}
		if (!isSelf) {
			rows[y].remove();
		}
	}

	/**
	 * @param {number} x
	 * @complexity `n²`
	 */
	removeTableCol(x) {
		for (const [token, start] of this.getFullCol(x)) {
			const {colspan} = token;
			if (colspan > 1) {
				token.colspan = colspan - 1;
				if (start) {
					token.lastElementChild.replaceChildren();
				}
			} else {
				token.remove();
			}
		}
	}

	/**
	 * @param {[number, number]} xlim
	 * @param {[number, number]} ylim
	 */
	mergeCells(xlim, ylim) {
		if ([...xlim, ...ylim].some(arg => typeof arg !== 'number')) {
			typeError(this, 'mergeCells', 'Number');
		}
		const [xmin, xmax] = xlim.sort(),
			[ymin, ymax] = ylim.sort(),
			layout = this.getLayout(),
			set = new Set(layout.slice(ymin, ymax).flatMap(rowLayout => rowLayout.slice(xmin, xmax)));
		if ([...layout[ymin - 1] ?? [], ...layout[ymax] ?? []].some(coords => set.has(coords))
			|| layout.some(rowLayout => set.has(rowLayout[xmin - 1]) || set.has(rowLayout[xmax]))
		) {
			throw new RangeError(`待合并区域与外侧区域有重叠！`);
		}
		const corner = layout[ymin][xmin],
			cornerCell = this.getNthCell(corner);
		set.delete(corner);
		const cells = [...set].map(coords => this.getNthCell(coords));
		cornerCell.rowspan = ymax - ymin;
		cornerCell.colspan = xmax - xmin;
		for (const cell of cells) {
			cell.remove();
		}
	}

	/**
	 * @param {TableCoords & TableRenderedCoords} coords
	 * @param {('rowspan'|'colspan')[]} dirs
	 */
	#split(coords, dirs) {
		const cell = this.getNthCell(coords),
			attr = cell.getAttr(),
			{subtype} = cell;
		attr.rowspan = Number(attr.rowspan) || 1;
		attr.colspan = Number(attr.colspan) || 1;
		if (dirs.every(dir => attr[dir] === 1)) {
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
						if (!(e instanceof RangeError) || !e.message.startsWith('指定的坐标不是单元格起始点：')) {
							throw e;
						}
						break;
					}
				}
			}
		}
	}

	/** @param {TableCoords & TableRenderedCoords} coords */
	splitIntoRows(coords) {
		this.#split(coords, ['rowspan']);
	}

	/** @param {TableCoords & TableRenderedCoords} coords */
	splitIntoCols(coords) {
		this.#split(coords, ['colspan']);
	}

	/** @param {TableCoords & TableRenderedCoords} coords */
	splitIntoCells(coords) {
		this.#split(coords, ['rowspan', 'colspan']);
	}
}

Parser.classes.TableToken = __filename;
module.exports = TableToken;
