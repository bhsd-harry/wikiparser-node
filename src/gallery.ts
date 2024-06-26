import {Shadow, isToken} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {NoincludeToken} from './nowiki/noinclude';
import type {LintError} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,

	/* NOT FOR BROWSER */

	AstNodes,
} from '../internal';

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|NoincludeToken|AstText)}`
 */
export abstract class GalleryToken extends Token {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (GalleryImageToken | NoincludeToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | NoincludeToken | AstText | undefined;
	abstract override get lastChild(): GalleryImageToken | NoincludeToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): (GalleryImageToken | NoincludeToken)[];
	abstract override get firstElementChild(): GalleryImageToken | NoincludeToken | undefined;
	abstract override get lastElementChild(): GalleryImageToken | NoincludeToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/* NOT FOR BROWSER */

	/** 所有图片 */
	override get images(): GalleryImageToken[] {
		return this.childNodes.filter(isToken<GalleryImageToken>('gallery-image'));
	}

	/* NOT FOR BROWSER END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
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
		return this.normalizeTitle(file, 6, true, true).valid;
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	override getGaps(): number {
		return 1;
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
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'noinclude' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					rule: 'no-ignored',
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: trimmed.startsWith('|') ? 'warning' : 'error',
					startIndex: start,
					endIndex: start + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					suggestions: [
						{
							desc: 'remove',
							range: [start, start + length],
							text: '',
						},
						{
							desc: 'comment',
							range: [start, start + length],
							text: `<!--${str}-->`,
						},
					],
				});
			} else if (child.type !== 'noinclude' && child.type !== 'text') {
				errors.push(...child.lint(start, re));
			}
			start += length + 1;
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new GalleryToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}

	/**
	 * 插入图片
	 * @param file 图片文件名
	 * @param i 插入位置
	 * @throws `SyntaxError` 非法的文件名
	 */
	insertImage(file: string, i?: number): GalleryImageToken {
		if (this.#checkFile(file)) {
			const token = Shadow.run(
				// @ts-expect-error abstract class
				(): GalleryImageToken => new GalleryImageToken('gallery', file, undefined, this.getAttribute('config')),
			);
			token.afterBuild();
			return this.insertAt(token, i);
		}
		throw new SyntaxError(`Invalid file name: ${file}`);
	}

	/**
	 * @override
	 * @param token 待插入的节点
	 * @param i 插入位置
	 * @throws `RangeError` 插入不可见内容
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i = this.length): T | AstText {
		if (typeof token === 'string' && token.trim() || token instanceof NoincludeToken) {
			throw new RangeError('Please do not insert invisible content into <gallery>!');
		}
		return super.insertAt(token as T, i);
	}
}

classes['GalleryToken'] = __filename;
