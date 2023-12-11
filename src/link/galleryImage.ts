import {generateForSelf} from '../../util/lint';
import {undo} from '../../util/debug';
import {
	MAX_STAGE,
	classes,
} from '../../util/constants';
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
	#title: Title;

	/* NOT FOR BROWSER */

	/** 图片链接 */
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
			for (let n = 1; n < MAX_STAGE; n++) {
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
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		return key === 'padding' ? 0 as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{
				interwiki,
				ns,
			} = this.#title;
		if (interwiki || ns !== 6) {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image'));
		}
		return errors;
	}

	/** @private */
	override afterBuild(): void {
		this.#title = this.#getTitle();
		this.setAttribute('name', this.#title.title);
		const /** @implements */ linkListener: AstListener = (e, data) => {
			const {prevTarget} = e;
			if (prevTarget?.type === 'link-target') {
				const name = String(prevTarget),
					titleObj = this.#getTitle(),
					{title, interwiki, ns, valid} = titleObj;
				if (!valid) {
					undo(e, data);
					throw new Error(`非法的图片文件名：${name}`);
				} else if (interwiki || ns !== 6) {
					undo(e, data);
					throw new Error(`图片链接不可更改命名空间：${name}`);
				}
				this.#title = titleObj;
				this.setAttribute('name', title);
			}
		};
		this.addEventListener(['remove', 'insert', 'replace', 'text'], linkListener);
	}

	/* NOT FOR BROWSER */

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

classes['GalleryImageToken'] = __filename;
