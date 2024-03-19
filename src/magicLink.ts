import {generateForChild} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {text} from '../util/string';
import {syntax} from '../mixin/syntax';
import Parser from '../index';
import {Token} from './index';
import type {LintError} from '../base';
import type {SyntaxBase} from '../mixin/syntax';
import type {
	AstText,
	CommentToken,
	IncludeToken,
	NoincludeToken,
	TranscludeToken,

	/* NOT FOR BROWSER */

	AstNodes,
	ParameterToken,
} from '../internal';

/** NOT FOR BROWSER */

export interface MagicLinkToken extends SyntaxBase {}

/** NOT FOR BROWSER END */

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
@syntax()
export abstract class MagicLinkToken extends Token {
	declare type: 'free-ext-link' | 'ext-link-url';

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/* NOT FOR BROWSER */

	abstract override get children(): (CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;
	abstract override get lastElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;

	/** 协议 */
	get protocol(): string | undefined {
		return this.pattern.exec(this.text())?.[0];
	}

	/** @throws `Error` 特殊外链无法更改协议n */
	set protocol(value: string) {
		const {link, pattern} = this;
		if (!pattern.test(link)) {
			throw new Error(`特殊外链无法更改协议：${link}`);
		}
		this.setTarget(link.replace(pattern, value));
	}

	/** 和内链保持一致 */
	get link(): string {
		const map = {'!': '|', '=': '='};
		return text(this.childNodes.map(child => {
			const {type, name} = child;
			return type === 'magic-word' && name in map ? map[name as keyof typeof map] : child;
		}));
	}

	set link(url) {
		this.setTarget(url);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param doubleSlash 是否接受"//"作为协议
	 */
	constructor(url?: string, doubleSlash?: boolean, config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, accum, {
			'Stage-1': '1:', '!ExtToken': '', AstText: ':', TranscludeToken: ':',
		});
		this.type = doubleSlash ? 'ext-link-url' : 'free-ext-link';

		/* NOT FOR BROWSER */

		this.setAttribute('pattern', new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'iu'));
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			const {type, data} = child;
			if (type !== 'text' || !regex.test(data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)!};
			const refError = generateForChild(child, rect, 'unterminated-url', '', 'warning');
			regexGlobal.lastIndex = 0;
			for (let mt = regexGlobal.exec(data); mt; mt = regexGlobal.exec(data)) {
				const {index, 0: s} = mt,
					lines = data.slice(0, index).split('\n'),
					top = lines.length,
					left = lines[top - 1]!.length,
					startIndex = refError.startIndex + index,
					startLine = refError.startLine + top - 1,
					startCol = top === 1 ? refError.startCol + left : left,
					pipe = s.startsWith('|');
				const e = {
					...refError,
					message: Parser.msg('$1 in URL', pipe ? '"|"' : 'full-width punctuation'),
					startIndex,
					endIndex: startIndex + s.length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + s.length,
				};
				if (!pipe) {
					e.suggestions = [
						{
							desc: 'whitespace',
							range: [startIndex, startIndex],
							text: ' ',
						},
						{
							desc: 'escape',
							range: [startIndex, e.endIndex],
							text: encodeURI(s),
						},
					];
				} else if (s.length === 1) {
					e.suggestions = [
						{
							desc: 'whitespace',
							range: [startIndex, startIndex + 1],
							text: ' ',
						},
					];
				}
				errors.push(e);
			}
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new MagicLinkToken(
				undefined,
				this.type === 'ext-link-url',
				this.getAttribute('config'),
			) as this;
			token.append(...cloned);
			token.afterBuild();
			return token;
		});
	}

	/**
	 * @override
	 * @param token 待插入的节点
	 * @param i 插入位置
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		if (typeof token !== 'string') {
			const {type, name} = token;
			if (type === 'template') {
				this.constructorError('不可插入模板');
			} else if (!Shadow.running && type === 'magic-word' && name !== '!' && name !== '=') {
				this.constructorError('不可插入 "{{!}}" 或 "{{=}}" 以外的魔术字');
			}
		}
		return super.insertAt(token as string, i);
	}

	/**
	 * 获取网址
	 * @throws `Error` 非标准协议
	 */
	getUrl(): URL {
		let {link} = this;
		if (link.startsWith('//')) {
			link = `https:${link}`;
		}
		try {
			return new URL(link);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${link}`);
			}
			throw e;
		}
	}

	/**
	 * 设置外链目标
	 * @param url 含协议的网址
	 */
	setTarget(url: string): void {
		const {childNodes} = Parser.parse(url, this.getAttribute('include'), 2, this.getAttribute('config'));
		this.replaceChildren(...childNodes);
	}

	/** 是否是模板或魔术字参数 */
	isParamValue(): boolean {
		return this.closest<ParameterToken>('parameter')?.getValue() === this.text();
	}

	/** 转义 `=` */
	escape(): void {
		for (const child of this.childNodes) {
			if (child.type === 'text') {
				child.escape();
			}
		}
	}
}

classes['MagicLinkToken'] = __filename;
