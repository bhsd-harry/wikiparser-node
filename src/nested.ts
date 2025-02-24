import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {parseCommentAndExt} from '../parser/commentAndExt';
import {parseBraces} from '../parser/braces';
import Parser from '../index';
import {Token} from './index';
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import type {LintError} from '../base';
import type {CommentToken, AttributesToken, IncludeToken, ArgToken, TranscludeToken} from '../internal';

declare type Child = ExtToken | NoincludeToken | CommentToken | IncludeToken | ArgToken | TranscludeToken;

const childTypes = new Set(['comment', 'include', 'arg', 'template', 'magic-word']);

/**
 * extension tag that has a nested structure
 *
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: (ExtToken|NoincludeToken|CommentToken)[]}`
 */
export abstract class NestedToken extends Token {
	declare readonly name: string;
	readonly #tags;
	readonly #regex;

	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/**
	 * @param regex 内层正则
	 * @param tags 内层标签名
	 */
	constructor(
		wikitext: string | undefined,
		regex: RegExp | boolean,
		tags: readonly string[],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		if (typeof regex === 'boolean') {
			const placeholder = Symbol('InputboxToken'),
				{length} = accum;
			accum.push(placeholder as unknown as Token);
			wikitext &&= parseCommentAndExt(wikitext, config, accum, regex);
			wikitext &&= parseBraces(wikitext, config, accum);
			accum.splice(length, 1);
		} else {
			wikitext &&= wikitext.replace(
				regex,
				(_, name: string, attr?: string, inner?: string, closing?: string) => {
					const str = `\0${accum.length + 1}e\x7F`;
					// @ts-expect-error abstract class
					new ExtToken(name, attr, inner, closing, config, false, accum);
					return str;
				},
			);
		}
		wikitext &&= wikitext.replace(
			/(^|\0\d+.\x7F)([^\0]+)(?=$|\0\d+.\x7F)/gu,
			(_, lead: string, substr: string) => {
				// @ts-expect-error abstract class
				new NoincludeToken(substr, config, accum);
				return `${lead}\0${accum.length}n\x7F`;
			},
		);
		super(
			wikitext,
			config,
			accum,
		);
		this.#tags = [...tags];
		this.#regex = regex;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const rect = new BoundingRect(this, start),
			noinclude = this.#regex ? 'includeonly' : 'noinclude';
		const regex = typeof this.#regex === 'boolean'
			? new RegExp(String.raw`^(?:<${noinclude}(?:\s[^>]*)?/?>|</${noinclude}\s*>)$`, 'iu')
			: /^<!--[\s\S]*-->$/u;
		return [
			...super.lint(start, re),
			...this.childNodes.filter(child => {
				const {type, name} = child;
				if (type === 'ext') {
					return !this.#tags.includes(name);
				} else if (childTypes.has(type)) {
					return false;
				}
				const str = child.toString().trim();
				return str && !regex.test(str);
			}).map(child => {
				const e = generateForChild(
					child,
					rect,
					'no-ignored',
					Parser.msg('invalid content in <$1>', this.name),
				);
				e.suggestions = [
					{desc: 'remove', range: [e.startIndex, e.endIndex], text: ''},
					{desc: 'comment', range: [e.startIndex, e.endIndex], text: `<!--${child.toString()}-->`},
				];
				return e;
			}),
		];
	}
}
