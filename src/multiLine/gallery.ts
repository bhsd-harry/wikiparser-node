import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import type {
	Config,
} from '../../base';
import type {
	AstText,
	Token,
} from '../../internal';

/**
 * `<gallery>`
 * @classdesc `{childNodes: (GalleryImageToken|AstText)[]}`
 */
export abstract class GalleryToken extends MultiLineToken {
	declare readonly childNodes: readonly (GalleryImageToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | AstText | undefined;
	abstract override get lastChild(): GalleryImageToken | AstText | undefined;

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config?: Config, accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		for (const line of inner?.split('\n') ?? []) {
			const matches = /^([^|]+)(?:\|(.*))?/u.exec(line) as [string, string, string | undefined] | null;
			if (!matches) {
				super.insertAt(line);
				continue;
			}
			const [, file, alt] = matches;
			if (this.#checkFile(file)) {
				// @ts-expect-error abstract class
				super.insertAt(new GalleryImageToken('gallery', file, alt, config, accum) as GalleryImageToken);
			} else {
				super.insertAt(line);
			}
		}
	}

	/**
	 * 检查文件名是否有效
	 * @param file 文件名
	 */
	#checkFile(file: string): boolean {
		return this.normalizeTitle(
			file,
			6,
			{halfParsed: true, temporary: true, decode: true, page: ''},
		).valid;
	}
}
