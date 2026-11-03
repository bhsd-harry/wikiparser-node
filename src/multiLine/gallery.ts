import {removeComment} from '../../util/string';
import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import {CommentToken} from '../nowiki/comment';
import type {
	Config,
} from '../../base';
import type {
	AstText,
	Token,
} from '../../internal';

declare type Child = GalleryImageToken
	;

/**
 * `<gallery>`
 */
export abstract class GalleryToken extends MultiLineToken {
	declare readonly childNodes: readonly (AstText | Child)[];
	abstract override get firstChild(): AstText | Child | undefined;
	abstract override get lastChild(): AstText | Child | undefined;

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		if (inner) {
			for (let line of inner.split('\n')) {
				line = line.replaceAll(/<!--(.*?)-->/gu, (_, p1) => {
					// @ts-expect-error abstract class
					new CommentToken(p1, true, config, accum);
					return `\0${accum.length}c\x7F`;
				});
				const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
				if (!matches) {
					super.insertAt(
						line,
					);
					continue;
				}
				const [, file, alt] = matches;
				if (this.#checkFile(file, true)) { // eslint-disable-line unicorn/prefer-ternary
					// @ts-expect-error abstract class
					super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
				} else {
					super.insertAt(
						line,
					);
				}
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 * @param parsing 是否在解析过程中
	 */
	#checkFile(file: string, parsing?: boolean): boolean {
		return this.normalizeTitle(
			parsing ? removeComment(file) : file,
			6,
			{halfParsed: true, temporary: true, decode: true, page: ''},
		).valid;
	}
}
