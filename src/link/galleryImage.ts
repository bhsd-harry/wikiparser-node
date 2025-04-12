import {generateForSelf} from '../../util/lint';
import {
	MAX_STAGE,
} from '../../util/constants';
import {padded} from '../../mixin/padded';
import {Token} from '../index';
import {FileToken} from './file';
import type {Title} from '../../lib/title';
import type {Config, LintError} from '../../base';

declare type GalleryTypes = 'gallery' | 'imagemap';

/**
 * gallery image
 *
 * 图库图片
 */
@padded(0)
export abstract class GalleryImageToken extends FileToken {
	/** @private */
	private readonly privateType: `${GalleryTypes}-image` = 'imagemap-image';

	override get type(): `${GalleryTypes}-image` {
		return this.privateType;
	}

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

		/* PRINT ONLY */

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
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{
				ns,
			} = this.getAttribute('title');
		if (
			ns !== 6
		) {
			const e = generateForSelf(this, {start}, 'invalid-gallery', 'invalid gallery image');
			e.suggestions = [{desc: 'prefix', range: [start, start], text: 'File:'}];
			errors.push(e);
		}
		return errors;
	}
}
