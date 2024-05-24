import {generateForChild, generateForSelf} from '../util/lint';
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

declare type ExtLinkTypes = 'free-ext-link' | 'ext-link-url' | 'magic-link';

/** NOT FOR BROWSER */

export interface MagicLinkToken extends SyntaxBase {}

const spdash = '(?:[\\p{Zs}\\t-]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)';

/** NOT FOR BROWSER END */

const space = '(?:[\\p{Zs}\\t]|&nbsp;|&#0*160;|&#[xX]0*[aA]0;)';

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
@syntax()
export abstract class MagicLinkToken extends Token {
	declare type: ExtLinkTypes;

	declare readonly childNodes: readonly (AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstChild(): AstText | TranscludeToken;
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken | TranscludeToken;

	/* NOT FOR BROWSER */

	abstract override get children(): (CommentToken | IncludeToken | NoincludeToken | TranscludeToken)[];
	abstract override get firstElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;
	abstract override get lastElementChild():
		CommentToken | IncludeToken | NoincludeToken | TranscludeToken | undefined;

	/* NOT FOR BROWSER END */

	/** 和内链保持一致 */
	get link(): string {
		const map = {'!': '|', '=': '='};
		let link = text(this.childNodes.map(child => {
			const {type, name} = child;
			return type === 'magic-word' && String(name) in map ? map[name as keyof typeof map] : child;
		}));
		if (this.type === 'magic-link') {
			link = link.replace(new RegExp(`${space}+`, 'gu'), ' ');
			if (link.startsWith('ISBN')) {
				link = `ISBN ${link.slice(5).replace(/[- ]/gu, '').replace(/x$/u, 'X')}`;
			}
		}
		return link;
	}

	/* NOT FOR BROWSER */

	set link(url) {
		this.setTarget(url);
	}

	/** 协议 */
	get protocol(): string | undefined {
		return this.pattern.exec(this.text())?.[1];
	}

	/** @throws `Error` 特殊外链无法更改协议n */
	set protocol(value: string) {
		const {link, pattern, type} = this;
		if (type === 'magic-link' || !pattern.test(link)) {
			throw new Error(`特殊外链无法更改协议：${link}`);
		}
		this.setTarget(link.replace(pattern, value));
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param type 类型
	 */
	constructor(url?: string, type: ExtLinkTypes = 'free-ext-link', config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, accum, {
			'Stage-1': '1:', '!ExtToken': '', AstText: ':', TranscludeToken: ':',
		});
		this.type = type;

		/* NOT FOR BROWSER */

		const pattern = type === 'magic-link'
			? new RegExp(
				url?.startsWith('ISBN')
					? `^(ISBN)${space}+(?:97[89]${spdash}?)?(?:\\d${spdash}?){9}[\\dxX]$`
					: `^(RFC|PMID)${space}+\\d+$`,
				'u',
			)
			: new RegExp(`^(${config.protocol}${type === 'ext-link-url' ? '|//' : ''})`, 'iu');
		this.setAttribute('pattern', pattern);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re);
		let rect: BoundingRect | undefined;
		if (this.type === 'magic-link') {
			const {link} = this;
			if (link.startsWith('ISBN')) {
				// eslint-disable-next-line unicorn/no-useless-spread
				const digits = [...link.slice(5)].map(s => s === 'X' ? 10 : Number(s));
				if (
					digits.length === 10 && digits.reduce((sum, d, i) => sum + d * (10 - i), 0) % 11
					|| digits.length === 13 && (
						digits[12] === 10
						|| digits.reduce((sum, d, i) => sum + d * (i % 2 ? 3 : 1), 0) % 10
					)
				) {
					rect = {start, ...this.getRootNode().posFromIndex(start)!};
					errors.push(generateForSelf(this, rect, 'invalid-isbn', 'invalid ISBN'));
				}
			}
			return errors;
		}
		const source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
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
			const token = new MagicLinkToken(undefined, this.type, this.getAttribute('config')) as this;
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
	 * @throws `Error` ISBN
	 * @throws `Error` 非标准协议
	 */
	getUrl(): URL {
		const {type, protocol} = this;
		let {link} = this;
		if (type === 'magic-link') {
			if (protocol === 'ISBN') {
				throw new Error(`不支持ISBN链接：${link}`);
			}
			link = protocol === 'RFC'
				? `https://tools.ietf.org/html/rfc${link.slice(4)}`
				: `https://pubmed.ncbi.nlm.nih.gov/${link.slice(5)}`;
		} else if (protocol === '//') {
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
