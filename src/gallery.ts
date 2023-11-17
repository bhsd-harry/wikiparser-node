import Parser from '../index';
import {Token} from '.';
import {GalleryImageToken} from './link/galleryImage';
import {HiddenToken} from './hidden';
import type {LintError} from '../index';
import type {AstNodes, AstText, AttributesToken, ExtToken} from '../internal';

/**
 * gallery标签
 * @classdesc `{childNodes: ...(GalleryImageToken|HiddenToken|AstText)}`
 */
export abstract class GalleryToken extends Token {
	/** @browser */
	override readonly type = 'ext-inner';
	declare name: 'gallery';
	declare childNodes: (GalleryImageToken | HiddenToken | AstText)[];
	abstract override get children(): (GalleryImageToken | HiddenToken)[];
	abstract override get firstChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	abstract override get firstElementChild(): GalleryImageToken | HiddenToken | undefined;
	abstract override get lastChild(): GalleryImageToken | HiddenToken | AstText | undefined;
	abstract override get lastElementChild(): GalleryImageToken | HiddenToken | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/** 所有图片 */
	override get images(): GalleryImageToken[] {
		return this.childNodes.filter(({type}) => type === 'gallery-image') as GalleryImageToken[];
	}

	/**
	 * @browser
	 * @param inner 标签内部wikitext
	 */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, true, accum, {
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
			const [, file, alt] = matches,
				title = this.normalizeTitle(file, 6, true, true);
			if (title.valid) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum));
			} else {
				super.insertAt(new HiddenToken(line, config, [], {
					AstText: ':',
				}));
			}
		}
	}

	/**
	 * @override
	 * @browser
	 */
	override toString(omit?: Set<string>): string {
		return super.toString(omit, '\n');
	}

	/**
	 * @override
	 * @browser
	 */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	protected override getGaps(i: number): number {
		return i < this.length - 1 ? 1 : 0;
	}

	/**
	 * @override
	 * @browser
	 */
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

	/**
	 * @override
	 * @browser
	 */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token: this = new GalleryToken(undefined, this.getAttribute('config'));
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
	insertImage(file: string, i = this.length): GalleryImageToken {
		const title = this.normalizeTitle(file, 6, true, true);
		if (title.valid) {
			const token: GalleryImageToken = Parser.run(
				// @ts-expect-error abstract class
				() => new GalleryImageToken('gallery', file, undefined, this.getAttribute('config')),
			);
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
	override insertAt<T extends AstNodes>(token: T | string, i = 0): T | AstText {
		if (typeof token === 'string' && token.trim() || token instanceof HiddenToken) {
			throw new RangeError('请勿向图库中插入不可见内容！');
		}
		return super.insertAt(token as T, i);
	}
}

Parser.classes['GalleryToken'] = __filename;
