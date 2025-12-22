import {
	MAX_STAGE,
} from '../../util/constants';
import {Token} from '../index';
import {FileToken} from './file';
import type {Config} from '../../base';

declare type GalleryTypes = 'gallery' | 'imagemap';

/**
 * gallery image
 *
 * 图库图片
 */
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
			for (let n = 0; n < MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(length, 1);
		}
		const privateType: `${GalleryTypes}-image` = `${type}-image`;
		super(link, token?.firstChild!.toString(), config, accum, undefined, privateType);
		this.privateType = privateType;
	}
}
