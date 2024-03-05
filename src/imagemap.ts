import {generateForSelf, generateForChild} from '../util/lint';
import {
	isToken,
} from '../util/debug';
import Parser from '../index';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import {GalleryImageToken} from './link/galleryImage';
import {ImagemapLinkToken} from './imagemapLink';
import type {LintError} from '../base';
import type {
	AstText,
	AttributesToken,
	ExtToken,
} from '../internal';

/**
 * `<imagemap>`
 * @classdesc `{childNodes: ...NoincludeToken, GalleryImageToken, ...(NoincludeToken|ImagemapLinkToken|AstText)}`
 */
export abstract class ImagemapToken extends Token {
	override readonly type = 'ext-inner';
	declare readonly name: 'imagemap';

	declare readonly childNodes: readonly (GalleryImageToken | NoincludeToken | ImagemapLinkToken | AstText)[];
	abstract override get firstChild(): NoincludeToken | GalleryImageToken | undefined;
	abstract override get lastChild(): GalleryImageToken | NoincludeToken | ImagemapLinkToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	/** 图片 */
	get image(): GalleryImageToken | undefined {
		return this.childNodes.find(isToken<GalleryImageToken>('imagemap-image'));
	}

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n'),
			protocols = new Set(config.protocol.split('|')),
			SingleLineNoincludeToken = singleLine(NoincludeToken);
		let first = true,
			error = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (error || !trimmed || trimmed.startsWith('#')) {
				//
			} else if (first) {
				const [file, ...options] = line.split('|') as [string, ...string[]],
					title = this.normalizeTitle(file, 0, true);
				if (title.valid && !title.interwiki && title.ns === 6) {
					// @ts-expect-error abstract class
					const token: GalleryImageToken = new GalleryImageToken(
						'imagemap',
						file,
						options.length > 0 ? options.join('|') : undefined,
						config,
						accum,
					);
					super.insertAt(token);
					first = false;
					continue;
				} else {
					error = true;
				}
			} else if (line.trim().split(/[\t ]/u)[0] === 'desc') {
				super.insertAt(line);
				continue;
			} else if (line.includes('[')) {
				const i = line.indexOf('['),
					substr = line.slice(i),
					mtIn = /^\[{2}([^|]+)(?:\|([^\]]+))?\]{2}[\w\s]*$/u
						.exec(substr) as [string, string, string | undefined] | null;
				if (mtIn) {
					if (this.normalizeTitle(mtIn[1], 0, true, false, true).valid) {
						// @ts-expect-error abstract class
						super.insertAt(new ImagemapLinkToken(
							line.slice(0, i),
							mtIn.slice(1) as [string, string | undefined],
							substr.slice(substr.indexOf(']]') + 2),
							config,
							accum,
						) as ImagemapLinkToken);
						continue;
					}
				} else if (
					protocols.has(substr.slice(1, substr.indexOf(':') + 1))
					|| protocols.has(substr.slice(1, substr.indexOf('//') + 2))
				) {
					const mtEx = /^\[([^\]\s]+)(?:(\s+(?=\S))([^\]]*))?\][\w\s]*$/u
						.exec(substr) as [string, string, string | undefined, string | undefined] | null;
					if (mtEx) {
						// @ts-expect-error abstract class
						super.insertAt(new ImagemapLinkToken(
							line.slice(0, i),
							mtEx.slice(1) as [string, string | undefined, string | undefined],
							substr.slice(substr.indexOf(']') + 1),
							config,
							accum,
						) as ImagemapLinkToken);
						continue;
					}
				}
			}
			// @ts-expect-error abstract class
			super.insertAt(new SingleLineNoincludeToken(line, config, accum) as SingleLineNoincludeToken);
		}
	}

	/** @private */
	override toString(): string {
		return super.toString('\n');
	}

	/** @override */
	override text(): string {
		return super.text('\n').replace(/\n{2,}/gu, '\n');
	}

	/** @private */
	override getGaps(): number {
		return 1;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect: BoundingRect = {start, ...this.getRootNode().posFromIndex(start)!};
		if (this.image) {
			errors.push(
				...this.childNodes.filter(child => {
					const str = String(child).trim();
					return child.type === 'noinclude' && str && !str.startsWith('#');
				}).map(child => generateForChild(child, rect, 'invalid-imagemap', 'invalid link in <imagemap>')),
			);
		} else {
			errors.push(generateForSelf(this, rect, 'invalid-imagemap', '<imagemap> without an image'));
		}
		return errors;
	}
}
