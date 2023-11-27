import {generateForSelf} from '../../util/lint';
import {undo} from '../../util/debug';
import {singleLine} from '../../mixin/singleLine';
import * as Parser from '../../index';
import {Token} from '../index';
import {FileToken} from './file';
import {galleryParams} from '../../index';
import type {Title} from '../../lib/title';
import type {LintError} from '../../index';
import type {AtomToken, ImageParameterToken} from '../../internal';

/** 图库图片 */
// @ts-expect-error not implementing all abstract methods
export class GalleryImageToken extends singleLine(FileToken) {
	declare type: 'gallery-image' | 'imagemap-image';

	/* NOT FOR BROWSER */

	/** 图片链接 */
	override get link(): string | Title {
		return this.type === 'imagemap-image' ? '' : super.link;
	}

	override set link(value) {
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

	/* NOT FOR BROWSER */

	/** @private */
	override afterBuild(): void {
		this.setAttribute('name', this.#getTitle().title);
		const /** @implements */ linkListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = String(prevTarget),
					{title, interwiki, ns, valid} = this.#getTitle();
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的图片文件名：${name}`);
				} else if (interwiki || ns !== 6) {
					undo(e, data);
					throw new Error(`图片链接不可更改命名空间：${name}`);
				}
				this.setAttribute('name', title);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `RangeError` 不可插入多余子节点
	 * @throws `TypeError` 不可插入文本节点
	 */
	override insertAt<T extends AtomToken | ImageParameterToken>(child: T, i?: number): T {
		if (this.type === 'gallery-image' && child.type === 'image-parameter' && !galleryParams.has(child.name)) {
			child.setAttribute('name', 'invalid');
		}
		return super.insertAt(child, i) as T;
	}
}

Parser.classes['GalleryImageToken'] = __filename;
