import {hiddenToken} from '../../mixin/hidden';
import {TagToken} from './index';
import {SyntaxToken} from '../syntax';
import type {Config} from '../../base';
import type {Token} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {Shadow} from '../../util/debug';

const legacyPattern = /^\|([^>]+)$/u,
	newPattern = /^\s+name\s*=(?:\s*(?:(["'])([\s\S]*?)\1|([^"'\s>]+)))?\s*$/iu,
	legacyClosingPattern = /^$/u,
	newClosingPattern = /^\s*$/u;

/* NOT FOR BROWSER END */

/**
 * `<tvar>`
 * @classdesc `{childNodes: [SyntaxToken]}`
 */
@hiddenToken()
export abstract class TvarToken extends TagToken {
	declare readonly childNodes: readonly [SyntaxToken];
	abstract override get firstChild(): SyntaxToken;
	abstract override get lastChild(): SyntaxToken;

	/* NOT FOR BROWSER */

	abstract override get children(): [SyntaxToken];
	abstract override get firstElementChild(): SyntaxToken;
	abstract override get lastElementChild(): SyntaxToken;

	/* NOT FOR BROWSER END */

	override get type(): 'tvar' {
		return 'tvar';
	}

	/** @private */
	override get closing(): boolean {
		return super.closing;
	}

	/* NOT FOR BROWSER */

	/** whether to use the legacy syntax / 是否使用旧语法 */
	get legacy(): boolean {
		const {pattern} = this.firstChild;
		return pattern === legacyPattern || pattern === legacyClosingPattern;
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: string, closing: boolean, config?: Config, accum?: Token[]) {
		/* NOT FOR BROWSER */

		let pattern: RegExp;
		if (closing) {
			pattern = tag ? newClosingPattern : legacyClosingPattern;
		} else {
			pattern = legacyPattern.test(attr) ? legacyPattern : newPattern;
		}

		/* NOT FOR BROWSER END */

		const attrToken = new SyntaxToken(
			attr,
			pattern,
			'tvar-name',
			config,
			accum,
			{AstText: ':'},
		);
		super(tag, attrToken, closing, config, accum);

		/* NOT FOR BROWSER */

		if (!closing) {
			this.#setName(attr, pattern);
		}
	}

	/** @private */
	override print(): string {
		return super.print({class: 'noinclude'});
	}

	/* NOT FOR BROWSER */

	/**
	 * 设置name
	 * @param attr 标签属性
	 * @param pattern 标签属性模式
	 */
	#setName(attr: string, pattern: RegExp): void {
		let name: string | undefined;
		if (pattern === legacyPattern) {
			[, name] = legacyPattern.exec(attr)!;
		} else {
			const mt = newPattern.exec(attr)!;
			name = mt[2] ?? mt[3];
		}
		this.setAttribute('name', name!);
	}

	override afterBuild(): void {
		super.afterBuild();
		if (!this.closing) {
			const /** @implements */ tvarListener: AstListener = ({prevTarget}) => {
				const {firstChild} = this;
				if (prevTarget === firstChild) {
					const {pattern} = firstChild,
						attr = firstChild.toString();
					if (pattern.test(attr)) {
						this.#setName(attr, pattern);
					}
				}
			};
			this.addEventListener(['remove', 'insert', 'replace', 'text'], tvarListener);
		}
	}

	override cloneNode(): this {
		const config = this.getAttribute('config');
		// @ts-expect-error abstract class
		return Shadow.run((): this => new TvarToken(this.tag, this.firstChild.toString(), this.closing, config));
	}

	/**
	 * Set the tvar name.
	 *
	 * 设置tvar变量名。
	 * @param name name / 变量名
	 * @since v1.28.0
	 * @throws `Error` 闭合标签
	 * @throws `SyntaxError` 同时包含单引号和双引号
	 */
	setName(name: string): void {
		const {closing, firstChild} = this;
		if (closing) {
			throw new Error('Cannot set name of a closing tvar tag');
		} else if (firstChild.pattern === legacyPattern) {
			firstChild.replaceChildren(`|${name}`);
		} else if (name.includes('"') && name.includes("'")) {
			throw new SyntaxError('Tvar name cannot contain both single and double quotes');
		} else {
			const quote = name.includes('"') ? "'" : '"';
			firstChild.replaceChildren(` name=${quote}${name}${quote}`);
		}
	}
}

classes['TvarToken'] = __filename;
