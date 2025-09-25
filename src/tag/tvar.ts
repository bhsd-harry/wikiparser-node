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

	/**
	 * @param tag 标签名
	 * @param attr 标签属性
	 * @param closing 是否闭合
	 */
	constructor(tag: string, attr: string, closing: boolean, config?: Config, accum?: Token[]) {
		/* NOT FOR BROWSER */

		let pattern: RegExp,
			name: string | undefined;
		if (closing) {
			pattern = tag ? newClosingPattern : legacyClosingPattern;
		} else if (legacyPattern.test(attr)) {
			pattern = legacyPattern;
			[, name] = legacyPattern.exec(attr)!;
		} else {
			pattern = newPattern;
			const mt = newPattern.exec(attr)!;
			name = mt[2] ?? mt[3];
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
			this.setAttribute('name', name!);
		}
	}

	/** @private */
	override print(): string {
		return super.print({class: 'noinclude'});
	}

	/* NOT FOR BROWSER */

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
