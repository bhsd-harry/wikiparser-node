import {generateForSelf, fixByInsert} from '../../util/lint';
import {
	MAX_STAGE,
} from '../../util/constants';
import {padded} from '../../mixin/padded';
import Parser from '../../index';
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
@padded('')
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
			for (let n = 0; n < MAX_STAGE - 1; n++) {
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

	/** 判定无效的图片 */
	#lint(): boolean {
		const {
			ns,
		} = this.getAttribute('title');
		// eslint-disable-next-line @stylistic/semi
		return ns !== 6
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				rule = 'invalid-gallery',
				s = Parser.lintConfig.getSeverity(rule, 'image');
			if (s && this.#lint()) {
				const e = generateForSelf(this, {start}, rule, 'invalid-gallery', s);
				e.suggestions = [fixByInsert(start, 'prefix', 'File:')];
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
}
