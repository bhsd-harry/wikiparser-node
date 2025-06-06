import {generateForSelf, generateForChild} from '../util/lint';
import {isToken} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import {multiLine} from '../mixin/multiLine';
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

declare type Child = GalleryImageToken | NoincludeToken;

/**
 * `<imagemap>`
 * @classdesc `{childNodes: [...NoincludeToken[], GalleryImageToken, ...(NoincludeToken|ImagemapLinkToken|AstText)[]]}`
 */
@multiLine
export abstract class ImagemapToken extends Token {
	declare readonly name: 'imagemap';

	declare readonly childNodes: readonly (Child | ImagemapLinkToken | AstText)[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | ImagemapLinkToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

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
			SingleLineNoincludeToken = NoincludeToken;
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
			} else if (line.trim().split(/[\t ]/u, 1)[0] === 'desc') {
				super.insertAt(line);
				continue;
			} else if (line.includes('[')) {
				const i = line.indexOf('['),
					substr = line.slice(i),
					mtIn = /^\[\[([^|]+)(?:\|([^\]]*))?\]\][\w\s]*$/u
						.exec(substr) as [string, string, string | undefined] | null;
				if (mtIn) {
					if (
						this.normalizeTitle(mtIn[1], 0, {halfParsed: true, temporary: true, selfLink: true})
							.valid
					) {
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
					substr.startsWith('[//')
					|| protocols.has(substr.slice(1, substr.indexOf(':') + 1))
					|| protocols.has(substr.slice(1, substr.indexOf('//') + 2))
				) {
					const mtEx = /^\[([^\]\s]+)(?:(\s+(?!\s))([^\]]*))?\][\w\s]*$/u
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
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start);
		if (this.image) {
			errors.push(
				...this.childNodes.filter(child => {
					const str = child.toString().trim();
					return child.type === 'noinclude' && str && !str.startsWith('#');
				}).map(child => {
					const e = generateForChild(
						child,
						rect,
						'invalid-imagemap',
						'invalid link in <imagemap>',
					);
					e.suggestions = [
						{desc: 'remove', range: [e.startIndex - 1, e.endIndex], text: ''},
						{desc: 'comment', range: [e.startIndex, e.startIndex], text: '# '},
					];
					return e;
				}),
			);
		} else {
			errors.push(generateForSelf(this, rect, 'invalid-imagemap', '<imagemap> without an image'));
		}
		return errors;
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? !this.image as TokenAttribute<T> : super.getAttribute(key);
	}
}
