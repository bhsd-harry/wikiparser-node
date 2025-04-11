import {generateForSelf} from '../../util/lint';
import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
} from '../../util/constants';
import {Token} from '../index';
import {FileToken} from './file';
import type {Title} from '../../lib/title';
import type {Config, LintError} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {singleLine} from '../../mixin/singleLine';
import {galleryParams} from '../imageParameter';
import type {AtomToken, ImageParameterToken} from '../../internal';

/* NOT FOR BROWSER END */

declare type GalleryTypes = 'gallery' | 'imagemap';

/**
 * gallery image
 *
 * 图库图片
 */
@singleLine()
export abstract class GalleryImageToken extends FileToken {
	/** @private */
	private readonly privateType: `${GalleryTypes}-image` = 'imagemap-image';

	override get type(): `${GalleryTypes}-image` {
		return this.privateType;
	}

	/* NOT FOR BROWSER */

	/** image link / 图片链接 */
	override get link(): string | Title {
		return this.type === 'imagemap-image' ? '' : super.link;
	}

	override set link(value: string) {
		if (this.type !== 'imagemap-image') {
			super.link = value;
		}
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param type 图片类型
	 * @param link 图片文件名
	 * @param text 图片参数
	 */
	constructor(type: GalleryTypes, link: string, text?: string, config?: Config, accum: Token[] = []) {
		let token: Token | undefined;
		if (text !== undefined) {
			const {length} = accum;
			token = new Token(text, config, accum);
			for (let n = 1; n < MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(length, 1);
		}
		super(link, token?.toString(), config, accum);
		this.setAttribute('bracket', false);
		this.privateType = `${type}-image`;
		this.seal('privateType', true);
	}

	/** @private */
	override getTitle(temporary?: boolean): Title {
		const imagemap = this.type === 'imagemap-image';
		return this.normalizeTitle(
			this.firstChild.toString(),
			imagemap ? 0 : 6,
			{halfParsed: true, temporary, decode: !imagemap},
		);
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding' ? 0 as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{
				ns,

				/* NOT FOR BROWSER */

				interwiki,
			} = this.getAttribute('title');
		if (
			ns !== 6
			|| interwiki
		) {
			const e = generateForSelf(this, {start}, 'invalid-gallery', 'invalid gallery image');
			e.suggestions = [{desc: 'prefix', range: [start, start], text: 'File:'}];
			errors.push(e);
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param child node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `RangeError` 不可插入多余子节点
	 * @throws `TypeError` 不可插入文本节点
	 */
	override insertAt<T extends AtomToken | ImageParameterToken>(child: T, i?: number): T {
		if (this.type === 'gallery-image' && child.type === 'image-parameter' && !galleryParams.has(child.name)) {
			child.setAttribute('name', 'invalid');
		}
		return super.insertAt(child, i);
	}

	override cloneNode(): this {
		const [link, ...linkText] = this.cloneChildNodes() as [AtomToken, ...ImageParameterToken[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new GalleryImageToken(
				this.type.slice(0, -6),
				'',
				undefined,
				this.getAttribute('config'),
			) as this;
			token.firstChild.safeReplaceWith(link);
			token.safeAppend(linkText);
			return token;
		});
	}
}

classes['GalleryImageToken'] = __filename;
