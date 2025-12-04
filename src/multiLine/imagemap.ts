import Parser from '../../index';
import {MultiLineToken} from './index';
import {GalleryImageToken} from '../link/galleryImage';
import type {
	AstText,
	Token,
} from '../../internal';

/**
 * `<imagemap>`
 * @classdesc `{childNodes: [...AstText[], GalleryImageToken, ...AstText[]]}`
 */
export abstract class ImagemapToken extends MultiLineToken {
	declare readonly childNodes: readonly (GalleryImageToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | undefined;
	abstract override get lastChild(): GalleryImageToken | AstText | undefined;

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
					} = this.normalizeTitle(file, 0, {halfParsed: true, temporary: true, page: ''});
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
