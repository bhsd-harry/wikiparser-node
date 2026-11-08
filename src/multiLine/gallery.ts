import {removeComment} from '../../util/string';
import {safeStringReplace} from '../../util/replace';
import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import {CommentLineToken} from '../nowiki/commentLine';
import {CommentToken} from '../nowiki/comment';
import type {
	Config,
} from '../../base';
import type {
	AstText,
	Token,
} from '../../internal';

/* NOT FOR BROWSER */

import {
	isToken,
} from '../../util/debug';

/* NOT FOR BROWSER END */

declare type Child = GalleryImageToken
	| CommentLineToken;

/**
 * `<gallery>`
 * @classdesc `{childNodes: (GalleryImageToken|CommentLineToken|AstText)[]}`
 */
export abstract class GalleryToken extends MultiLineToken {
	declare readonly name: 'gallery';

	declare readonly childNodes: readonly (AstText | Child)[];
	abstract override get firstChild(): AstText | Child | undefined;
	abstract override get lastChild(): AstText | Child | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];

	/* NOT FOR BROWSER END */

	/* PRINT ONLY */

	/**
	 * image widths
	 *
	 * 图片宽度
	 * @since v1.12.5
	 */
	get widths(): number {
		LSP: return this.#getSize('widths');
	}

	/**
	 * image heights
	 *
	 * 图片高度
	 * @since v1.12.5
	 */
	get heights(): number {
		LSP: return this.#getSize('heights');
	}

	/* PRINT ONLY END */

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		if (inner) {
			for (let line of inner.split('\n')) {
				line = safeStringReplace(line, '<!--', '-->', false, p => {
					// @ts-expect-error abstract class
					new CommentToken(p, true, config, accum);
					return `\0${accum.length}c\x7F`;
				});
				const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
				if (!matches) {
					super.insertAt(
						(
							line.trim()
								// @ts-expect-error abstract class
								? new CommentLineToken(
									line,
									config,
									accum,
								)
								: line
						) as string,
					);
					continue;
				}
				const [, file, alt] = matches;
				if ( // eslint-disable-line unicorn/prefer-ternary
					this.#checkFile(
						file,
					)
				) {
					// @ts-expect-error abstract class
					super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
				} else {
					super.insertAt(
						// @ts-expect-error abstract class
						new CommentLineToken(
							line,
							config,
							accum,
						) as CommentLineToken,
					);
				}
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(
		file: string,
	): boolean {
		return this.normalizeTitle(
			removeComment(file),
			6,
			{halfParsed: true, temporary: true, decode: true, page: ''},
		).valid;
	}

	/* PRINT ONLY */

	/**
	 * 获取图片的宽度或高度
	 * @param key `widths` 或 `heights`
	 */
	#getSize(key: 'widths' | 'heights'): number {
		LSP: {
			const widths = this.parentNode?.getAttr(key),
				mt = widths && /^(\d+)\s*(?:px)?$/u.exec(widths)?.[1];
			return mt && Number(mt) || 120;
		}
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	override toHtmlOrPlain(func: HtmlOrPlainFunc): string {
		return func(this.childNodes.filter(isToken('gallery-image')), '\n');
	}
}
