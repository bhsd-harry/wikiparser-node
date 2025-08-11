import {generateForSelf, generateForChild, fixBy, fixByRemove} from '../util/lint';
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

	/* NOT FOR BROWSER */

	AstNodes,
} from '../internal';

/* NOT FOR BROWSER */

import {classes} from '../util/constants';
import {clone} from '../mixin/clone';
import {singleLine} from '../mixin/singleLine';

/* NOT FOR BROWSER END */

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

	/* NOT FOR BROWSER */

	abstract override get children(): (Child | ImagemapLinkToken)[];
	abstract override get firstElementChild(): Child | undefined;
	abstract override get lastElementChild(): Child | ImagemapLinkToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

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
			GalleryImageToken: ':', ImagemapLinkToken: ':', NoincludeToken: ':', AstText: ':',
		});
		if (!inner) {
			return;
		}
		const lines = inner.split('\n'),
			protocols = new Set(config.protocol.split('|')),
			SingleLineNoincludeToken = singleLine()(NoincludeToken);
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

						/* NOT FOR BROWSER */

						interwiki,
					} = this.normalizeTitle(file, 0, {halfParsed: true, temporary: true});
				if (
					valid
					&& !interwiki
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
			rect = new BoundingRect(this, start),
			{childNodes, image} = this,
			rule = 'invalid-imagemap',
			s = Parser.lintConfig.getSeverity(rule, image ? 'link' : 'image');
		if (s) {
			if (image) {
				errors.push(
					...childNodes.filter(child => {
						const str = child.toString().trim();
						return child.is<NoincludeToken>('noinclude') && str && !str.startsWith('#');
					}).map(child => {
						const e = generateForChild(child, rect, rule, 'invalid link in <imagemap>', s);
						e.suggestions = [
							fixByRemove(e, -1),
							fixBy(e, 'comment', '# '),
						];
						return e;
					}),
				);
			} else {
				errors.push(generateForSelf(this, rect, rule, '<imagemap> without an image', s));
			}
		}
		return errors;
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? !this.image as TokenAttribute<T> : super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token node to be inserted / 待插入的节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `Error` 当前缺少合法图片
	 * @throws `RangeError` 已有一张合法图片
	 */
	override insertAt(token: string, i?: number): AstText;
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

	/**
	 * @override
	 * @param i position of the child node /移除位置
	 * @throws `Error` 禁止移除图片
	 */
	override removeAt(i: number): AstNodes {
		if (this.childNodes[i]?.is<GalleryImageToken>('imagemap-image')) {
			throw new Error('Do not remove the image in <imagemap>!');
		}
		return super.removeAt(i);
	}

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new ImagemapToken(undefined, this.getAttribute('config'));
	}
}

classes['ImagemapToken'] = __filename;
