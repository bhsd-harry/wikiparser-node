import {generateForSelf, generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {
	isToken,

	/* NOT FOR BROWSER */

	Shadow,
} from '../util/debug';
import {classes} from '../util/constants';
import {singleLine} from '../mixin/singleLine';
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

	/* NOT FOR BROWSER */

	abstract override get children(): (GalleryImageToken | NoincludeToken | ImagemapLinkToken)[];
	abstract override get firstElementChild(): NoincludeToken | GalleryImageToken | undefined;
	abstract override get lastElementChild(): GalleryImageToken | NoincludeToken | ImagemapLinkToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get previousElementSibling(): AttributesToken;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

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
					mtIn = /^\[\[([^|]+)(?:\|([^\]]+))?\]\][\w\s]*$/u
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
	override toString(): string {
		return super.toString('\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n{2,}/gu, '\n');
	}

	/** @private */
	override getGaps(): number {
		return 1;
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
				}).map(child => generateForChild(child, rect, 'invalid-imagemap', 'invalid link in <imagemap>')),
			);
		} else {
			errors.push(generateForSelf(this, rect, 'invalid-imagemap', '<imagemap> without an image'));
		}
		return errors;
	}

	/** @private */
	override print(): string {
		return super.print({sep: '\n'});
	}

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token 待插入的节点
	 * @param i 插入位置
	 * @throws `Error` 当前缺少合法图片
	 * @throws `RangeError` 已有一张合法图片
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		const {image} = this;
		if (!image && (typeof token === 'string' || token.type === 'imagemap-link' || token.type === 'text')) {
			throw new Error('Missing a valid image!');
		} else if (image && typeof token !== 'string' && token.type === 'imagemap-image') {
			throw new RangeError('Already have a valid image!');
		}
		return super.insertAt(token as T, i);
	}

	/**
	 * @override
	 * @param i 移除位置
	 * @throws `Error` 禁止移除图片
	 */
	override removeAt(i: number): AstNodes {
		if (this.childNodes[i]?.type === 'imagemap-image') {
			throw new Error('Do not remove the image in <imagemap>!');
		}
		return super.removeAt(i);
	}

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ImagemapToken(undefined, this.getAttribute('config')) as this;
			token.append(...cloned);
			return token;
		});
	}
}

classes['ImagemapToken'] = __filename;
