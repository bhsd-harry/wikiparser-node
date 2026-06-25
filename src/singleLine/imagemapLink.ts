import {generateForChild} from '../../util/lint';
import Parser from '../../index';
import {SingleLineToken} from './index';
import {NoincludeToken} from '../nowiki/noinclude';
import {LinkToken} from '../link/index';
import {ExtLinkToken} from '../extLink';
import type {Config, LintError} from '../../base';
import type {AstText, ImagemapToken, GalleryImageToken, Token} from '../../internal';

const shapes = new Set(['default', 'rect', 'circle', 'poly']);

/** @ignore */
const notNumeric = (s: string, allowNegative?: boolean): boolean => {
	const n = Number(s);
	return Number.isNaN(n) || n > 1e9 || !allowNegative && n < 0;
};

/**
 * link inside the `<imagemap>`
 *
 * `<imagemap>`内的链接
 * @classdesc `{childNodes: [AstText, LinkToken|ExtLinkToken, NoincludeToken]}`
 */
export abstract class ImagemapLinkToken extends SingleLineToken {
	declare readonly childNodes: readonly [AstText, LinkToken | ExtLinkToken, NoincludeToken];
	abstract override get firstChild(): AstText;
	abstract override get lastChild(): NoincludeToken;
	abstract override get parentNode(): ImagemapToken | undefined;
	abstract override get previousSibling(): GalleryImageToken | this | NoincludeToken | AstText | undefined;
	abstract override get nextSibling(): this | NoincludeToken | AstText | undefined;

	override get type(): 'imagemap-link' {
		return 'imagemap-link';
	}

	/**
	 * @param pre 链接前的文本
	 * @param linkStuff 内外链接
	 * @param post 链接后的文本
	 */
	constructor(
		pre: string,
		linkStuff: readonly [string, string | undefined, string | undefined] | readonly [string, string | undefined],
		post: string,
		config: Config,
		accum: Token[] = [],
	) {
		super(undefined, config, accum);
		this.append(
			pre,
			linkStuff.length === 2
				// @ts-expect-error abstract class
				? new LinkToken(...linkStuff, config, accum) as LinkToken
				// @ts-expect-error abstract class
				: new ExtLinkToken(...linkStuff, config, accum) as ExtLinkToken,
			// @ts-expect-error abstract class
			new NoincludeToken(post, config, accum) as NoincludeToken,
		);
	}

	/**
	 * 检查链接区域是否合法
	 * @param errors 错误列表
	 * @param coords 坐标字符串
	 * @param start 节点起始位置
	 * @param minCount 最少需要的坐标数量
	 * @param isPoly 是否为多边形
	 */
	#lintCoords(errors: LintError[], coords: string, start: number, minCount: number, isPoly?: boolean): void {
		LINT: {
			const parts = coords.split(/[ \t]+/u).map(s => s.trim()).filter(Boolean),
				{length} = parts,
				rule = 'invalid-imagemap',
				s = Parser.lintConfig.getSeverity(rule, 'coord');
			if (s && (length < minCount || isPoly && length % 2 || parts.some(part => notNumeric(part, isPoly)))) {
				errors.push(generateForChild(this.firstChild, {start}, rule, 'invalid-coord', s));
			}
		}
	}

	/** 获取链接区域图形和坐标 */
	#getShape(): [string, string] | false {
		const area = this.firstChild.data.trim(),
			i = area.search(/[ \t]/u),
			shape = i === -1 ? area : area.slice(0, i);
		return shapes.has(shape) && [shape, area.slice(i).trim()];
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				{firstChild} = this,
				shapeAndCoords = this.#getShape();
			if (shapeAndCoords) {
				const [shape, coords] = shapeAndCoords;
				switch (shape) {
					case 'default':
						break;
					case 'rect':
						this.#lintCoords(errors, coords, start, 4);
						break;
					case 'circle':
						this.#lintCoords(errors, coords, start, 3);
						break;
					case 'poly':
						this.#lintCoords(errors, coords, start, 1, true);
					// no default
				}
			} else {
				const rule = 'invalid-imagemap',
					s = Parser.lintConfig.getSeverity(rule, 'shape');
				if (s) {
					errors.push(generateForChild(firstChild, {start}, rule, 'unrecognized-shape', s));
				}
			}
			return errors;
		}
	}
}
