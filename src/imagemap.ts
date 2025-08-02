import {multiLine} from '../mixin/multiLine';
import Parser from '../index';
import {Token} from './index';
import {GalleryImageToken} from './link/galleryImage';
import type {
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

declare type Child = GalleryImageToken;

/**
 * `<imagemap>`
 * @classdesc `{childNodes: [...AstText[], GalleryImageToken, ...AstText[]]}`
 */
@multiLine
export abstract class ImagemapToken extends Token {
	declare readonly childNodes: readonly (Child | AstText)[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n');
		let first = true,
			error = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (error || !trimmed || trimmed.startsWith('#')) {
				//
			} else if (first) {
				const pipe = line.indexOf('|'),
					file = pipe === -1 ? line : line.slice(0, pipe),
					{
						valid,
						ns,
					} = this.normalizeTitle(file, 0, {halfParsed: true, temporary: true});
				if (
					valid
					&& ns === 6
				) {
					// @ts-expect-error abstract class
					const token: GalleryImageToken = new GalleryImageToken(
						'imagemap',
						file,
						pipe === -1 ? undefined : line.slice(pipe + 1),
						config,
						accum,
					);
					super.insertAt(token);
					first = false;
					continue;
				} else {
					error = true;
				}
			}
			super.insertAt(line);
		}
	}
}
