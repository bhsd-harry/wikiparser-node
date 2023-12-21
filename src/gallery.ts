import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import * as Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import {HiddenToken} from './hidden';
import type {LintError} from '../base';
import type {
	AstNodes,
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
export class GalleryToken extends Token {
	override readonly type = 'ext-inner';
	declare name: 'gallery';

	declare childNodes: (GalleryImageToken | HiddenToken | AstText)[];
	// @ts-expect-error abstract method
	abstract override get children(): (GalleryImageToken | HiddenToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): GalleryImageToken | HiddenToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): GalleryImageToken | HiddenToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AttributesToken;
	// @ts-expect-error abstract method
	abstract override get parentNode(): ExtToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	/** 所有图片 */
	override get images(): GalleryImageToken[] {
		return this.childNodes.filter((child): child is GalleryImageToken => child.type === 'gallery-image');
	}

	/* NOT FOR BROWSER END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			AstText: ':', GalleryImageToken: ':', HiddenToken: ':',
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				super.insertAt((line.trim()
					? new HiddenToken(line, config, [], {
						AstText: ':',
					})
					: line) as string);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum));
			} else {
				super.insertAt(new HiddenToken(line, config, [], {
					AstText: ':',
				}));
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
	override toString(omit?: Set<string>): string {
		return super.toString(omit, '\n');
	}

	/** @override */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	protected override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const {top, left} = this.getRootNode().posFromIndex(start)!,
			errors: LintError[] = [];
		for (let i = 0; i < this.length; i++) {
			const child = this.childNodes[i]!,
				str = String(child),
				{length} = str,
				trimmed = str.trim(),
				startLine = top + i,
				startCol = i ? 0 : left;
			if (child.type === 'hidden' && trimmed && !/^<!--.*-->$/u.test(trimmed)) {
				errors.push({
					message: Parser.msg('invalid content in <$1>', 'gallery'),
					severity: 'error',
					startIndex: start,
					endIndex: start + length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + length,
					excerpt: String(child).slice(0, 50),
				});
			} else if (child.type !== 'hidden' && child.type !== 'text') {
				errors.push(...child.lint(start));
			}
			start += length + 1;
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
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
				() => new GalleryImageToken('gallery', file, undefined, this.getAttribute('config')),
			);
			token.afterBuild();
			return this.insertAt(token, i);
		}
		throw new SyntaxError(`非法的文件名：${file}`);
	}

	/**
	 * @override
	 * @param token 待插入的节点
	 * @param i 插入位置
	 * @throws `RangeError` 插入不可见内容
	 */
	override insertAt(token: string, i?: number): AstText;
	/** @ignore */
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	/** @ignore */
	override insertAt<T extends AstNodes>(token: T | string, i = this.length): T | AstText {
		if (typeof token === 'string' && token.trim() || token instanceof HiddenToken) {
			throw new RangeError('请勿向图库中插入不可见内容！');
		}
		return super.insertAt(token as T, i);
	}
}

classes['GalleryToken'] = __filename;
