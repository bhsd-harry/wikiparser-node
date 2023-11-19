import {generateForChild} from '../util/lint';
import Parser from '../index';
import {Token} from '.';
import type {LintError} from '../index';
import type {ParameterToken} from './parameter';

/**
 * 自由外链
 * @classdesc `{childNodes: ...AstText|CommentToken|IncludeToken|NoincludeToken}`
 */
export class MagicLinkToken extends Token {
	declare type: 'free-ext-link' | 'ext-link-url';
	#protocolRegex;

	/** 协议 */
	get protocol(): string | undefined {
		return this.#protocolRegex.exec(this.text())?.[0];
	}

	/**
	 * @throws `RangeError` 非法协议
	 * @throws `Error` 特殊外链无法更改协议
	 */
	set protocol(value) {
		if (typeof value !== 'string') {
			this.typeError('protocol', 'String');
		} else if (!new RegExp(`${this.#protocolRegex.source}$`, 'iu').test(value)) {
			throw new RangeError(`非法的外链协议：${value}`);
		}
		const {link} = this;
		if (!this.#protocolRegex.test(link)) {
			throw new Error(`特殊外链无法更改协议：${link}`);
		}
		this.replaceChildren(link.replace(this.#protocolRegex, value));
	}

	/** 和内链保持一致 */
	get link(): string {
		return this.text();
	}

	set link(url) {
		this.setTarget(url);
	}

	/**
	 * @browser
	 * @param url 网址
	 * @param doubleSlash 是否接受"//"作为协议
	 */
	constructor(url?: string, doubleSlash = false, config = Parser.getConfig(), accum: Token[] = []) {
		super(url, config, true, accum, {
			'Stage-1': ':', '!ExtToken': '',
		});
		this.type = doubleSlash ? 'ext-link-url' : 'free-ext-link';
		this.#protocolRegex = new RegExp(`^(?:${config.protocol}${doubleSlash ? '|//' : ''})`, 'iu');
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			source = `[，；。：！？（）]+${this.type === 'ext-link-url' ? '|\\|+' : ''}`,
			regex = new RegExp(source, 'u'),
			regexGlobal = new RegExp(source, 'gu');
		let rect: BoundingRect | undefined;
		for (const child of this.childNodes) {
			if (child.type !== 'text' || !regex.test(child.data)) {
				continue;
			}
			rect ??= {start, ...this.getRootNode().posFromIndex(start)};
			const {data} = child,
				refError = generateForChild(child, rect, '', 'warning');
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

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes();
		return Parser.run(() => {
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
	 * @throws `SyntaxError` 非法的自由外链目标
	 */
	setTarget(url: string): void {
		const root = Parser.parse(url, this.getAttribute('include'), 9, this.getAttribute('config')),
			{length, firstChild: freeExtLink} = root;
		if (length !== 1 || freeExtLink!.type !== 'free-ext-link') {
			throw new SyntaxError(`非法的自由外链目标：${url}`);
		}
		this.replaceChildren(...freeExtLink!.childNodes);
	}

	/** 是否是模板或魔术字参数 */
	isParamValue(): boolean {
		return (this.closest('parameter') as ParameterToken | undefined)?.getValue() === this.text();
	}
}

Parser.classes['MagicLinkToken'] = __filename;
