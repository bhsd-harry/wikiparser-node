import {generateForSelf} from '../../util/lint';
import * as Parser from '../../index';
import {Token} from '../index';
import {FileToken} from './file';
import type {LintError} from '../../index';

/** 图库图片 */
// @ts-expect-error not implementing all abstract methods
export class GalleryImageToken extends singleLine(FileToken) {
	declare type: 'gallery-image' | 'imagemap-image';

	/**
	 * @param type 图片类型
	 * @param link 图片文件名
	 * @param text 图片参数
	 */
	constructor(
		type: 'gallery' | 'imagemap',
		link: string,
		text?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		let token: Token | undefined;
		if (text !== undefined) {
			token = new Token(text, config, accum);
			token.type = 'plain';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		super(link, token?.toString(), config, accum);
		this.setAttribute('bracket', false);
		this.type = `${type}-image`;
	}

	/** 生成Title对象 */
	#getTitle(): Title {
		const imagemap = this.type === 'imagemap-image';
		return this.normalizeTitle(String(this.firstChild), imagemap ? 0 : 6, true, !imagemap);
	}

	/** @private */
	protected override getPadding(): number {
		return 0;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{interwiki, ns} = this.#getTitle();
		if (interwiki || ns !== 6) {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image'));
		}
		return errors;
	}
}
