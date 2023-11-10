import {generateForSelf} from '../../util/lint';
import {undo} from '../../util/debug';
import {singleLine} from '../../mixin/singleLine';
import {Parser} from '../../index';
import {Token} from '..';
import {FileToken} from './file';
import type {Title} from '../../lib/title';
import type {LintError} from '../../index';
import type {ExtToken, GalleryToken} from '../../internal';

/** 图库图片 */
export abstract class GalleryImageToken extends singleLine(FileToken) {
	declare type: 'gallery-image' | 'imagemap-image';
	/** @browser */
	#invalid = false;

	/** 图片链接 */
	override get link(): string | Title {
		return this.type === 'imagemap-image' ? '' : super.link;
	}

	override set link(value) {
		if (this.type !== 'imagemap-image') {
			super.link = value;
		}
	}

	/**
	 * @browser
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
			token = new Token(text, config, true, accum);
			token.type = 'plain';
			for (let n = 1; n < Parser.MAX_STAGE; n++) {
				token.parseOnce();
			}
			accum.splice(accum.indexOf(token), 1);
		}
		super(link, token?.toString(), config, accum);
		this.setAttribute('bracket', false).type = `${type}-image`;
	}

	/** @private */
	protected override afterBuild(): void {
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

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.#invalid) {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image'));
		}
		return errors;
	}

	/**
	 * @override
	 * @param link 链接目标
	 * @throws `SyntaxError` 非法的链接目标
	 */
	override setTarget(link: string): void {
		const include = this.getAttribute('include'),
			config = this.getAttribute('config'),
			root = Parser.parse(`<gallery>${link}</gallery>`, include, 1, config),
			{length, firstChild: ext} = root;
		if (length !== 1 || ext!.type !== 'ext') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {lastChild: gallery} = ext as ExtToken,
			{firstChild: image} = gallery as GalleryToken;
		if (gallery.length !== 1 || image!.type !== 'gallery-image') {
			throw new SyntaxError(`非法的图库文件名：${link}`);
		}
		const {firstChild} = image as this;
		(image as this).destroy();
		this.firstChild.safeReplaceWith(firstChild);
	}
}

Parser.classes['GalleryImageToken'] = __filename;
