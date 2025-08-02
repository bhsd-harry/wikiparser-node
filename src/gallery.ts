import {multiLine} from '../mixin/multiLine';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import type {
	Config,
} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

declare type Child = GalleryImageToken;

/**
 * gallery tag
 *
 * gallery标签
 * @classdesc `{childNodes: (GalleryImageToken|AstText)[]}`
 */
@multiLine
export abstract class GalleryToken extends Token {
	declare readonly childNodes: readonly (Child | AstText)[];
	abstract override get firstChild(): Child | AstText | undefined;
	abstract override get lastChild(): Child | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

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
		return this.normalizeTitle(file, 6, {halfParsed: true, temporary: true, decode: true}).valid;
	}
}
