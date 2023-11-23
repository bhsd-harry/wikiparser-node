import {generateForSelf} from '../../util/lint';
import {undo} from '../../util/debug';
import {singleLine} from '../../mixin/singleLine';
import * as Parser from '../../index';
import {Token} from '../index';
import {FileToken} from './file';
import {galleryParams} from '../../index';
import type {Title} from '../../lib/title';
import type {LintError} from '../../index';
import type {ExtToken, GalleryToken, AtomToken, ImageParameterToken} from '../../internal';

/** 图库图片 */
// @ts-expect-error not implementing all abstract methods
export class GalleryImageToken extends singleLine(FileToken) {
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
		(this.setAttribute('bracket', false) as this).type = `${type}-image`;
	}

	/** @private */
	override afterBuild(): void {
		const initImagemap = this.type === 'imagemap-image',
			titleObj = this.normalizeTitle(String(this.firstChild), initImagemap ? 0 : 6, true, !initImagemap);
		this.setAttribute('name', titleObj.title);
		this.#invalid = Boolean(titleObj.interwiki) || titleObj.ns !== 6; // 只用于gallery-image的首次解析
		const /** @implements */ linkListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = String(prevTarget),
					imagemap = this.type === 'imagemap-image',
					{title, interwiki, ns, valid} = this.normalizeTitle(name, imagemap ? 0 : 6, true, !imagemap);
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的图片文件名：${name}`);
				} else if (interwiki || ns !== 6) {
					undo(e, data);
					throw new Error(`图片链接不可更改命名空间：${name}`);
				}
				this.setAttribute('name', title);
				this.#invalid = false;
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
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

Parser.classes['GalleryImageToken'] = __filename;
