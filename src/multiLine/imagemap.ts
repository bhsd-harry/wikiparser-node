import {generateForSelf, generateForChild, fixBy, fixByRemove} from '../../util/lint';
import {isToken} from '../../util/debug';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {MultiLineToken} from './index';
import {CommentLineToken} from '../nowiki/commentLine';
import {GalleryImageToken} from '../link/galleryImage';
import {ImagemapLinkToken} from '../imagemapLink';
import type {LintError} from '../../base';
import type {
	AstText,
	Token,

	/* NOT FOR BROWSER */

	AstNodes,
} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * `<imagemap>`
 * @classdesc `{childNodes: [...CommentLineToken[], GalleryImageToken, ...(CommentLineToken|ImagemapLinkToken|AstText)[]]}`
 */
export abstract class ImagemapToken extends MultiLineToken {
	declare readonly name: 'imagemap';

	declare readonly childNodes: readonly (GalleryImageToken | CommentLineToken | ImagemapLinkToken | AstText)[];
	abstract override get firstChild(): GalleryImageToken | CommentLineToken | undefined;
	abstract override get lastChild(): GalleryImageToken | CommentLineToken | ImagemapLinkToken | AstText | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): (GalleryImageToken | CommentLineToken | ImagemapLinkToken)[];
	abstract override get firstElementChild(): GalleryImageToken | CommentLineToken | undefined;
	abstract override get lastElementChild(): GalleryImageToken | CommentLineToken | ImagemapLinkToken | undefined;

	/* NOT FOR BROWSER END */

	/** 图片 */
	get image(): GalleryImageToken | undefined {
		return this.childNodes.find(isToken<GalleryImageToken>('imagemap-image'));
	}

	/** @param inner 标签内部wikitext */
	constructor(inner?: string, config = Parser.getConfig(), accum: Token[] = []) {
		super(undefined, config, accum, {
			GalleryImageToken: ':', ImagemapLinkToken: ':', CommentLineToken: ':', AstText: ':',
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n'),
			protocols = new Set(config.protocol.split('|'));
		let first = true,
			error = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (error || !trimmed || trimmed.startsWith('#')) {
				//
			} else if (first) {
				const pipe = line.indexOf('|'),
					file = pipe === -1 ? line : line.slice(0, pipe),
					title = this.normalizeTitle(file, 0, {halfParsed: true, temporary: true, page: ''});
				if (
					title.valid && title.ns === 6
					&& !title.interwiki
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
						this.normalizeTitle(
							mtIn[1],
							0,
							{halfParsed: true, temporary: true, selfLink: true, page: ''},
						).valid
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
			super.insertAt(new CommentLineToken(line, config, accum) as CommentLineToken);
		}
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				rect = new BoundingRect(this, start),
				{childNodes, image} = this,
				rule = 'invalid-imagemap',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule, image ? 'link' : 'image');
			if (s) {
				if (image) {
					Array.prototype.push.apply(
						errors,
						childNodes.filter(child => {
							const str = child.toString().trim();
							return child.is<CommentLineToken>('noinclude')
								&& str && !str.startsWith('#');
						}).map(child => {
							const e = generateForChild(child, rect, rule, 'invalid-imagemap-link', s);
							if (lintConfig.computeEditInfo) {
								e.suggestions = [
									fixByRemove(e, -1),
									fixBy(e, 'comment', '# '),
								];
							}
							return e;
						}),
					);
				} else {
					errors.push(generateForSelf(this, rect, rule, 'imagemap-without-image', s));
				}
			}
			return errors;
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? !this.image as TokenAttribute<T> : super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/** @private */
	override insertAt(token: string, i?: number): AstText;
	/** @private */
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		const {image} = this;
		if (
			!image && (
				typeof token === 'string' || token.is<ImagemapLinkToken>('imagemap-link') || token.type === 'text'
			)
		) {
			throw new Error('Missing a valid image!');
		} else if (image && typeof token !== 'string' && token.is<GalleryImageToken>('imagemap-image')) {
			throw new RangeError('Already have a valid image!');
		}
		return super.insertAt(token as T, i);
	}

	/** @private */
	override removeAt(i: number): AstNodes {
		if (!this.parentNode?.selfClosing && this.childNodes[i]?.is<GalleryImageToken>('imagemap-image')) {
			throw new Error('Do not remove the image in <imagemap>!');
		}
		return super.removeAt(i);
	}
}

classes['ImagemapToken'] = __filename;
