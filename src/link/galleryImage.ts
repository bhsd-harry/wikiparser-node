import {generateForSelf} from '../../util/lint';
import * as Parser from '../../index';
import {Token} from '../index';
import {FileToken} from './file';
import type {LintError} from '../../index';

/** 图库图片 */
// @ts-expect-error not implementing all abstract methods
export class GalleryImageToken extends FileToken {
	declare type: 'gallery-image' | 'imagemap-image';
	#invalid = false;

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

	/** @private */
	override afterBuild(): void {
		const initImagemap = this.type === 'imagemap-image',
			titleObj = this.normalizeTitle(String(this.firstChild), initImagemap ? 0 : 6, true, !initImagemap);
		this.#invalid = titleObj.ns !== 6; // 只用于gallery-image的首次解析
	}

	/** @private */
	protected override getPadding(): number {
		return 0;
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image'));
		}
		return errors;
	}
}
