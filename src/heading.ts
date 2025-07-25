import {generateForChild, generateForSelf} from '../util/lint';
import {
	isToken,

	/* NOT FOR BROWSER */

	Shadow,
} from '../util/debug';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {SyntaxToken} from './syntax';
import type {
	Config,
	LintError,
	AST,
} from '../base';
import type {QuoteToken, AstText} from '../internal';

/* NOT FOR BROWSER */

import {classes, states} from '../util/constants';
import {sanitizeId} from '../util/string';
import {getId} from '../util/html';
import {fixedToken} from '../mixin/fixed';
import {sol} from '../mixin/sol';
import {noEscape} from '../mixin/noEscape';
import {cached} from '../mixin/cached';

/* NOT FOR BROWSER END */

/**
 * section heading
 *
 * 章节标题
 * @classdesc `{childNodes: [Token, SyntaxToken]}`
 */
@fixedToken @sol() @noEscape
export abstract class HeadingToken extends Token {
	#level;

	declare readonly childNodes: readonly [Token, SyntaxToken];
	abstract override get firstChild(): Token;
	abstract override get lastChild(): SyntaxToken;
	abstract override get nextSibling(): AstText | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): [Token, SyntaxToken];
	abstract override get firstElementChild(): Token;
	abstract override get lastElementChild(): SyntaxToken;

	/* NOT FOR BROWSER END */

	override get type(): 'heading' {
		return 'heading';
	}

	/** level of the heading / 标题层级 */
	get level(): number {
		return this.#level;
	}

	/* NOT FOR BROWSER */

	set level(n) {
		this.setLevel(n);
	}

	/** inner wikitext / 内部wikitext */
	get innerText(): string {
		return this.firstChild.text().trim();
	}

	/** @throws `Error` 首尾包含`=` */
	set innerText(text) {
		if (text.length > 1 && text.startsWith('=') && text.endsWith('=')) {
			throw new Error('Please use HeadingToken.setLevel method to change the level of the heading!');
		}
		const {childNodes} = Parser
			.parse(text, this.getAttribute('include'), undefined, this.getAttribute('config'));
		this.firstChild.safeReplaceChildren(childNodes);
	}

	/**
	 * id attribute
	 *
	 * id属性
	 * @since v1.12.4
	 */
	get id(): string {
		return this.#getId(true);
	}

	/* NOT FOR BROWSER END */

	/**
	 * @param level 标题层级
	 * @param input 标题文字
	 */
	constructor(level: number, input: readonly [string?, string?], config: Config, accum: Token[] = []) {
		super(undefined, config, accum);
		this.#level = level;
		const token = new Token(input[0], config, accum);
		token.type = 'heading-title';
		token.setAttribute('stage', 2);
		const trail = new SyntaxToken(
			input[1],
			/^\s*$/u,
			'heading-trail',
			config,
			accum,
			{'Stage-1': ':', '!ExtToken': ''},
		);
		this.append(token, trail);
	}

	/** 标题格式的等号 */
	#getEquals(): string {
		return '='.repeat(this.level);
	}

	/** @private */
	override toString(skip?: boolean): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.toString(skip) + equals + this.lastChild.toString(skip);
	}

	/** @private */
	override text(): string {
		const equals = this.#getEquals();
		return equals + this.firstChild.text() + equals;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* PRINT ONLY */

		if (key === 'invalid') {
			return (this.inHtmlAttrs() === 2) as TokenAttribute<T>;
		}

		/* PRINT ONLY END */

		return key === 'padding' ? this.level as TokenAttribute<T> : super.getAttribute(key);
	}

	/** @private */
	override getGaps(): number {
		return this.level;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{firstChild, level} = this,
			innerStr = firstChild.toString(),
			unbalancedStart = innerStr.startsWith('='),
			unbalanced = unbalancedStart || innerStr.endsWith('='),
			rect = new BoundingRect(this, start),
			s = this.inHtmlAttrs(),
			rules = ['h1', 'unbalanced-header', 'format-leakage'] as const,
			severities = rules.map(rule => Parser.lintConfig.getSeverity(rule, 'apostrophe'));
		if (severities[0] && this.level === 1) {
			const e = generateForChild(firstChild, rect, rules[0], '<h1>', severities[0]);
			if (!unbalanced) {
				e.suggestions = [{desc: 'h2', range: [e.startIndex, e.endIndex], text: `=${innerStr}=`}];
			}
			errors.push(e);
		}
		if (severities[1] && unbalanced) {
			const msg = Parser.msg('unbalanced $1 in a section header', '"="'),
				e = generateForChild(firstChild, rect, rules[1], msg, severities[1]);
			if (innerStr === '=') {
				//
			} else if (unbalancedStart) {
				const [extra] = /^=+/u.exec(innerStr)!,
					newLevel = level + extra.length;
				e.suggestions = [{desc: `h${level}`, range: [e.startIndex, e.startIndex + extra.length], text: ''}];
				if (newLevel < 7) {
					e.suggestions.push({desc: `h${newLevel}`, range: [e.endIndex, e.endIndex], text: extra});
				}
			} else {
				const extra = /[^=](=+)$/u.exec(innerStr)![1]!,
					newLevel = level + extra.length;
				e.suggestions = [{desc: `h${level}`, range: [e.endIndex - extra.length, e.endIndex], text: ''}];
				if (newLevel < 7) {
					e.suggestions.push({desc: `h${newLevel}`, range: [e.startIndex, e.startIndex], text: extra});
				}
			}
			errors.push(e);
		}
		if (s) {
			const rule = 'parsing-order',
				severity = Parser.lintConfig.getSeverity(rule, s === 2 ? 'heading' : 'templateInTable');
			if (severity) {
				errors.push(generateForSelf(this, rect, rule, 'section header in HTML tag attributes', severity));
			}
		}
		if (severities[2]) {
			const rootStr = this.getRootNode().toString(),
				quotes = firstChild.childNodes.filter(isToken<QuoteToken>('quote')),
				boldQuotes = quotes.filter(({bold}) => bold),
				italicQuotes = quotes.filter(({italic}) => italic);
			if (boldQuotes.length % 2) {
				const e = generateForChild(
						boldQuotes[boldQuotes.length - 1]!,
						{
							...rect, // eslint-disable-line @typescript-eslint/no-misused-spread
							start: start + level,
							left: rect.left + level,
						},
						rules[2],
						Parser.msg('unbalanced $1 in a section header', 'bold apostrophes'),
						severities[2],
					),
					end = start + level + innerStr.length;
				if (rootStr.slice(e.endIndex, end).trim()) {
					e.suggestions = [{desc: 'close', range: [end, end], text: `'''`}];
				} else {
					e.fix = {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
				}
				errors.push(e);
			}
			if (italicQuotes.length % 2) {
				const e = generateForChild(
						italicQuotes[italicQuotes.length - 1]!,
						{start: start + level},
						rules[2],
						Parser.msg('unbalanced $1 in a section header', 'italic apostrophes'),
						severities[2],
					),
					end = start + level + innerStr.length;
				if (rootStr.slice(e.endIndex, end).trim()) {
					e.suggestions = [{desc: 'close', range: [end, end], text: `''`}];
				} else {
					e.fix = {desc: 'remove', range: [e.startIndex, e.endIndex], text: ''};
				}
				errors.push(e);
			}
		}
		return errors;
	}

	/** @private */
	override print(): string {
		const equals = this.#getEquals();
		return super.print({pre: equals, sep: equals});
	}

	/** @private */
	override json(_?: string, start = this.getAbsoluteIndex()): AST {
		const json = super.json(undefined, start);
		json['level'] = this.level;
		return json;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const [title, trail] = this.cloneChildNodes() as [Token, SyntaxToken];
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new HeadingToken(this.level, [], this.getAttribute('config'));
			token.firstChild.safeReplaceWith(title);
			token.lastChild.safeReplaceWith(trail);
			return token;
		});
	}

	/**
	 * Set the level of heading
	 *
	 * 设置标题层级
	 * @param n level of heading / 标题层级
	 */
	setLevel(n: number): void {
		this.#level = Math.min(Math.max(n, 1), 6);
	}

	/**
	 * Remove the invisible content following the heading
	 *
	 * 移除标题后的不可见内容
	 */
	removeTrail(): void {
		this.lastChild.replaceChildren();
	}

	/**
	 * id属性
	 * @param expand 是否展开模板
	 */
	#getId(expand?: boolean): string {
		return getId(this.firstChild[expand ? 'expand' : 'cloneNode']());
	}

	/** @private */
	@cached()
	override toHtmlInternal(): string {
		let id = this.#getId();
		const {level, firstChild} = this,
			lcId = id.toLowerCase(),
			headings = states.get(this.getRootNode())?.headings;
		if (headings?.has(lcId)) {
			let i = 2;
			for (; headings.has(`${lcId}_${i}`); i++) {
				//
			}
			id = `${id}_${i}`;
			headings.add(`${lcId}_${i}`);
		} else {
			headings?.add(lcId);
		}
		return `<div class="mw-heading mw-heading${level}"><h${level} id="${sanitizeId(id)}">${
			firstChild.toHtmlInternal().trim()
		}</h${level}></div>`;
	}
}

classes['HeadingToken'] = __filename;
