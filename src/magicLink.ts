import {generateForChild} from '../util/lint';
import {Shadow} from '../util/debug';
import {syntax} from '../mixin/syntax';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError} from '../index';
import type {ParameterToken, AstText, CommentToken, IncludeToken, NoincludeToken} from '../internal';

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
export class MagicLinkToken extends syntax(Token) {
	declare type: 'free-ext-link' | 'ext-link-url';

	declare childNodes: (AstText | CommentToken | IncludeToken | NoincludeToken)[];
	// @ts-expect-error abstract method
	abstract override get children(): (CommentToken | IncludeToken | NoincludeToken)[];
	// @ts-expect-error abstract method
	abstract override get firstChild(): AstText | CommentToken | IncludeToken | NoincludeToken;
	// @ts-expect-error abstract method
	abstract override get firstElementChild(): CommentToken | IncludeToken | NoincludeToken | undefined;
	// @ts-expect-error abstract method
	abstract override get lastChild(): AstText | CommentToken | IncludeToken | NoincludeToken;
	// @ts-expect-error abstract method
	abstract override get lastElementChild(): CommentToken | IncludeToken | NoincludeToken | undefined;

	/* NOT FOR BROWSER */

	/** 协议 */
	get protocol(): string | undefined {
		return this.getAttribute('pattern').exec(this.text())?.[0];
	}

	/** @throws `Error` 特殊外链无法更改协议n */
	set protocol(value) {
		if (typeof value !== 'string') {
			this.typeError('protocol', 'String');
		}
		const {link} = this,
			pattern = this.getAttribute('pattern');
		if (!pattern.test(link)) {
			throw new Error(`特殊外链无法更改协议：${link}`);
		}
		this.setTarget(link.replace(pattern, value));
	}

	/** 和内链保持一致 */
	get link(): string {
		return this.text();
	}

	set link(url) {
		this.setTarget(url);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param url 网址
	 * @param doubleSlash 是否接受"//"作为协议
	 */
	constructor(url?: string, doubleSlash = false, config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.type = doubleSlash ? 'ext-link-url' : 'free-ext-link';
		this.setAttribute('pattern', new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'iu'));
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			const {type, data} = child;
			if (type !== 'text' || !regex.test(data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			const refError = generateForChild(child, rect, '', 'warning');
			errors.push(...[...data.matchAll(regexGlobal)].map(({index, 0: s}) => {
				const lines = data.slice(0, index).split('\n'),
					{length: top} = lines,
					{length: left} = lines.at(-1)!,
					startIndex = start + index!,
					startLine = refError.startLine + top - 1,
					startCol = top === 1 ? refError.startCol + left : left;
				return {
					...refError,
					message: Parser.msg('$1 in URL', s.startsWith('|') ? '"|"' : Parser.msg('full-width punctuation')),
					startIndex,
					endIndex: startIndex + s.length,
					startLine,
					endLine: startLine,
					startCol,
					endCol: startCol + s.length,
					excerpt: data.slice(Math.max(0, index! - 25), index! + 25),
				};
			}));
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Shadow.run(() => {
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
	 * 获取网址
	 * @throws `Error` 非标准协议
	 */
	getUrl(): URL {
		let url = this.text();
		if (url.startsWith('//')) {
			url = `https:${url}`;
		}
		try {
			return new URL(url);
		} catch (e) {
			if (e instanceof TypeError && e.message === 'Invalid URL') {
				throw new Error(`非标准协议的外部链接：${url}`);
			}
			throw e;
		}
	}

	/**
	 * 设置外链目标
	 * @param url 含协议的网址
	 */
	setTarget(url: string): void {
		const {childNodes} = Parser.parse(url, this.getAttribute('include'), 1, this.getAttribute('config'));
		this.replaceChildren(...childNodes);
	}

	/** 是否是模板或魔术字参数 */
	isParamValue(): boolean {
		return (this.closest('parameter') as ParameterToken | undefined)?.getValue() === this.text();
	}
}

Shadow.classes['MagicLinkToken'] = __filename;
