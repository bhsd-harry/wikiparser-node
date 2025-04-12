import {generateForChild} from '../util/lint';
import {BoundingRect} from '../lib/rect';
import {parseCommentAndExt} from '../parser/commentAndExt';
import {parseBraces} from '../parser/braces';
import Parser from '../index';
import {Token} from './index';
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import type {Config, LintError} from '../base';
import type {CommentToken, AttributesToken, IncludeToken, ArgToken, TranscludeToken} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import {cloneNode} from '../util/html';

/* NOT FOR BROWSER END */

declare type Child = ExtToken | NoincludeToken | CommentToken | IncludeToken | ArgToken | TranscludeToken;

const childTypes = new Set(['comment', 'include', 'arg', 'template', 'magic-word']),
	lintRegex = [false, true].map(article => {
		const noinclude = article ? 'includeonly' : 'noinclude';
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		/^(?:<noinclude(?:\s[^>]*)?\/?>|<\/noinclude\s*>)$/iu;
		return new RegExp(String.raw`^(?:<${noinclude}(?:\s[^>]*)?/?>|</${noinclude}\s*>)$`, 'iu');
	}) as [RegExp, RegExp];

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
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get children(): Child[];
	abstract override get firstElementChild(): Child | undefined;
	abstract override get lastElementChild(): Child | undefined;
	abstract override get previousElementSibling(): AttributesToken | undefined;
	abstract override get nextElementSibling(): undefined;
	abstract override get parentElement(): ExtToken | undefined;

	/* NOT FOR BROWSER END */

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
		config: Config,
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
			typeof regex === 'boolean' ? {'Stage-2': ':', '!HeadingToken': ''} : {NoincludeToken: ':', ExtToken: ':'},
		);
		this.#tags = [...tags];
		this.#regex = regex;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const rect = new BoundingRect(this, start),
			regex = typeof this.#regex === 'boolean' ? lintRegex[this.#regex ? 1 : 0] : /^<!--[\s\S]*-->$/u;
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

	/* NOT FOR BROWSER */

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inseted at / 插入位置
	 */
	override insertAt<T extends Token>(token: T, i?: number): T {
		if (!Shadow.running && token.type === 'ext' && !this.#tags.includes(token.name!)) {
			this.constructorError(`can only have ${this.#tags.join(' or ')} tags as child nodes`);
		}
		return super.insertAt(token, i);
	}

	override cloneNode(): this {
		return cloneNode(
			this,
			// @ts-expect-error abstract class
			() => new NestedToken(undefined, this.#regex, this.#tags, this.getAttribute('config')),
		);
	}
}

classes['NestedToken'] = __filename;
