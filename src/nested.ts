import {parseCommentAndExt} from '../parser/commentAndExt';
import {parseBraces} from '../parser/braces';
import {Token} from './index';
import type {Config} from '../base';
import type {
	NoincludeToken,
	CommentToken,
	AttributesToken,
	IncludeToken,
	ArgToken,
	TranscludeToken,
	ExtToken,
} from '../internal';

declare type Child = ExtToken | NoincludeToken | CommentToken | IncludeToken | ArgToken | TranscludeToken;

/**
 * extension tag that has a nested structure
 *
 * 嵌套式的扩展标签
 * @classdesc `{childNodes: (ExtToken|NoincludeToken|CommentToken)[]}`
 */
export abstract class NestedToken extends Token {
	declare readonly childNodes: readonly Child[];
	abstract override get firstChild(): Child | undefined;
	abstract override get lastChild(): Child | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
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
		regex: boolean,
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
		super(
			wikitext,
			config,
			accum,
		);
	}
}
