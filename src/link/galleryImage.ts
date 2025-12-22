import {generateForSelf, fixByInsert} from '../../util/lint';
import {
	MAX_STAGE,

	/* NOT FOR BROWSER */

	classes,
	galleryParams,
} from '../../util/constants';
import {padded} from '../../mixin/padded';
import Parser from '../../index';
import {Token} from '../index';
import {FileToken} from './file';
import type {Title} from '../../lib/title';
import type {Config, LintError} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {singleLine} from '../../mixin/singleLine';
import type {AtomToken, ImageParameterToken} from '../../internal';

/* NOT FOR BROWSER END */

declare type GalleryTypes = 'gallery' | 'imagemap';

/**
 * gallery image
 *
 * 图库图片
 */
@singleLine
@padded('')
export abstract class GalleryImageToken extends FileToken {
	/** @private */
	private readonly privateType: `${GalleryTypes}-image` = 'imagemap-image';

	override get type(): `${GalleryTypes}-image` {
		return this.privateType;
	}

	/* NOT FOR BROWSER */

	/** @private */
	override get link(): string | Title {
		return this.type === 'imagemap-image' ? '' : super.link;
	}

	/** @private */
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
			for (let n = 0; n < MAX_STAGE - 1; n++) {
				token.parseOnce();
			}
			accum.splice(length, 1);
		}
		const privateType: `${GalleryTypes}-image` = `${type}-image`;
		super(link, token?.firstChild!.toString(), config, accum, undefined, privateType);
		this.setAttribute('bracket', false);
		this.privateType = privateType;

		/* PRINT ONLY */

		this.seal('privateType', true);
	}

	/** @private */
	override getTitle(temporary?: boolean): Title {
		const imagemap = this.type === 'imagemap-image';
		return this.normalizeTitle(
			this.firstChild.toString(),
			imagemap ? 0 : 6,
			{halfParsed: true, temporary, decode: !imagemap, page: ''},
		);
	}

	/** 判定无效的图片 */
	#lint(): boolean {
		const title = this.getAttribute('title');
		return title.ns !== 6
			|| Boolean(title.interwiki);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: {
			const errors = super.lint(start, re),
				rule = 'invalid-gallery',
				{lintConfig} = Parser,
				s = lintConfig.getSeverity(rule, 'image');
			if (s && this.#lint()) {
				const e = generateForSelf(this, {start}, rule, 'invalid-gallery', s);
				if (lintConfig.computeEditInfo) {
					e.suggestions = [fixByInsert(start, 'prefix', 'File:')];
				}
				errors.push(e);
			}
			return errors;
		}
	}

	/* PRINT ONLY */

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'invalid' ? this.#lint() as TokenAttribute<T> : super.getAttribute(key);
	}

	/* PRINT ONLY END */

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param child node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt<T extends AtomToken | ImageParameterToken>(child: T, i?: number): T {
		if (
			this.type === 'gallery-image'
			&& child.is<ImageParameterToken>('image-parameter')
			&& !galleryParams.has(child.name)
		) {
			child.setAttribute('name', 'invalid');
		}
		return super.insertAt(child, i);
	}

	override cloneNode(): this {
		const [link, ...linkText] = this.cloneChildNodes() as [AtomToken, ...ImageParameterToken[]];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new GalleryImageToken(
				this.type.slice(0, -6),
				'',
				undefined,
				this.getAttribute('config'),
			);
			token.firstChild.safeReplaceWith(link);
			token.safeAppend(linkText);
			return token;
		});
	}
}

classes['GalleryImageToken'] = __filename;
