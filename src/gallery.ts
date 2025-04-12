import {multiLine} from '../mixin/multiLine';
import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {NoincludeToken} from './nowiki/noinclude';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,

	/* NOT FOR BROWSER */

	AstNodes,
} from '../internal';

/* NOT FOR BROWSER */

import {Shadow, isToken} from '../util/debug';
import {classes} from '../util/constants';
import {html, cloneNode} from '../util/html';

/* NOT FOR BROWSER END */

declare type Child = GalleryImageToken | NoincludeToken;

/**
 * gallery tag
 *
 * gallery标签
 * @classdesc `{childNodes: (GalleryImageToken|NoincludeToken|AstText)[]}`
 */
@multiLine
export abstract class GalleryToken extends Token {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (Child | AstText)[];
	abstract override get firstChild(): Child | AstText | undefined;
	abstract override get lastChild(): Child | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];
	abstract override get firstElementChild(): Child | undefined;
	abstract override get lastElementChild(): Child | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/* PRINT ONLY */

	/** image widths / 图片宽度 */
	get widths(): number {
		return this.#getSize('widths');
	}

	/** image heights / 图片高度 */
	get heights(): number {
		return this.#getSize('heights');
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** all images / 所有图片 */
	override get images(): GalleryImageToken[] {
		return this.childNodes.filter(isToken<GalleryImageToken>('gallery-image'));
	}

	/* NOT FOR BROWSER END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
			AstText: ':', GalleryImageToken: ':', NoincludeToken: ':',
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				// @ts-expect-error abstract class
				super.insertAt((line.trim() ? new NoincludeToken(line, config, accum) : line) as string);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
			} else {
				// @ts-expect-error abstract class
				super.insertAt(new NoincludeToken(line, config, accum) as NoincludeToken);
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(file: string): boolean {
		return this.normalizeTitle(file, 6, {halfParsed: true, temporary: true, decode: true}).valid;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const {top, left} = this.getRootNode().posFromIndex(start)!,
			errors: LintError[] = [];
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				str = child.toString(),
				{length} = str,
				trimmed = str.trim(),
				{type} = child,
				startLine = top + i,
				startCol = i ? 0 : left;
			child.setAttribute('aIndex', start);
			if (type === 'noinclude' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				const endIndex = start + length;
				errors.push({
					rule: 'no-ignored',
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: trimmed.startsWith('|') ? 'warning' : 'error',
					startIndex: start,
					endIndex,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					suggestions: [
						{desc: 'remove', range: [start, endIndex], text: ''},
						{desc: 'comment', range: [start, endIndex], text: `<!--${str}-->`},
					],
				});
			} else if (type !== 'noinclude' && type !== 'text') {
				const childErrors = child.lint(start, re);
				if (childErrors.length > 0) {
					errors.push(...childErrors);
				}
			}
			start += length + 1;
		}
		return errors;
	}

	/* PRINT ONLY */

	/**
	 * 获取图片的宽度或高度
	 * @param key `widths` 或 `heights`
	 */
	#getSize(key: 'widths' | 'heights'): number {
		const widths = this.parentNode?.getAttr(key),
			mt = typeof widths === 'string' && /^(\d+)\s*(?:px)?$/u.exec(widths)?.[1];
		return mt && Number(mt) || 120;
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		Object.assign(json, {widths: this.widths, heights: this.heights});
		return json;
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		// @ts-expect-error abstract class
		return cloneNode(this, () => new GalleryToken(undefined, this.getAttribute('config')));
	}

	/**
	 * Insert an image
	 *
	 * 插入图片
	 * @param file image file name / 图片文件名
	 * @param i position to be inserted at / 插入位置
	 * @throws `SyntaxError` 非法的文件名
	 */
	insertImage(file: string, i?: number): GalleryImageToken {
		if (this.#checkFile(file)) {
			const token = Shadow.run(
				(): GalleryImageToken =>
					// @ts-expect-error abstract class
					new GalleryImageToken('gallery', file, undefined, this.getAttribute('config')),
			);
			return this.insertAt(token, i);
		}
		throw new SyntaxError(`Invalid file name: ${file}`);
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` 插入不可见内容
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i = this.length): T | AstText {
		if (!Shadow.running && (typeof token === 'string' && token.trim() || token instanceof NoincludeToken)) {
			throw new RangeError('Please do not insert invisible content into <gallery>!');
		}
		return super.insertAt(token as T, i);
	}

	/** @private */
	override toHtmlInternal(): string {
		return html(this.childNodes.filter(isToken<GalleryImageToken>('gallery-image')), '\n');
	}
}

classes['GalleryToken'] = __filename;
