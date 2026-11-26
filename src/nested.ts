import {parseCommentAndExt} from '../parser/commentAndExt';
import {parseBraces} from '../parser/braces';
import {Token} from './index';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {ExtToken} from './tagPair/ext';
import {NoincludeToken} from './nowiki/noinclude';
import type {
	Config,
} from '../base';
import type {CommentToken, AttributesToken, IncludeToken, ArgToken, TranscludeToken} from '../internal';

/* NOT FOR BROWSER */

import {clone} from '../mixin/clone';

/* NOT FOR BROWSER END */

declare type Child = ExtToken | NoincludeToken | CommentToken | IncludeToken | ArgToken | TranscludeToken;

/**
 * extension tag that has a nested structure
 *
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: (ExtToken|NoincludeToken|CommentToken|IncludeToken|ArgToken|TranscludeToken)[]}`
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
		regex:
			boolean,
		tags: readonly string[],
		config: Config,
		accum: Token[] = [],
	) {
		const placeholder = Symbol('NestedToken'),
			{length} = accum;
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseCommentAndExt(wikitext, config, accum, regex);
		wikitext &&= parseBraces(wikitext, config, accum);
		accum.splice(length, 1);
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

	/* NOT FOR BROWSER */

	@clone
	override cloneNode(): this {
		// @ts-expect-error abstract class
		return new NestedToken(undefined, this.#regex, this.#tags, this.getAttribute('config'));
	}
}
