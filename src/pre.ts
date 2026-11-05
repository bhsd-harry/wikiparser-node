import {
	MAX_STAGE,
} from '../util/constants';
import {safeStringReplace} from '../util/replace';
import {Token} from './index';
import {NoincludeToken} from './nowiki/noinclude';
import type {Config, LintError} from '../base';
import type {AstText, AttributesToken, ExtToken, ConverterToken} from '../internal';

/**
 * `<pre>`
 * @classdesc `{childNodes: (AstText|NoincludeToken|ConverterToken)[]}`
 */
export abstract class PreToken extends Token {
	declare readonly name: 'pre';

	declare readonly childNodes: readonly (NoincludeToken | ConverterToken | AstText)[];
	abstract override get firstChild(): NoincludeToken | ConverterToken | AstText | undefined;
	abstract override get lastChild(): NoincludeToken | ConverterToken | AstText | undefined;
	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(wikitext?: string, config?: Config, accum: Token[] = []) {
		wikitext &&= safeStringReplace(
			wikitext,
			'<nowiki>',
			'</nowiki>',
			true,
			(inner, opening, closing) => {
				// @ts-expect-error abstract class
				new NoincludeToken(opening, config, accum, true);
				// @ts-expect-error abstract class
				new NoincludeToken(closing, config, accum, true);
				return `\0${accum.length - 1}n\x7F${inner}\0${accum.length}n\x7F`;
			},
		);
		super(wikitext, config, accum, {
		});
		this.setAttribute('stage', MAX_STAGE - 1);
	}

	/** @private */
	override isPlain(): true {
		return true;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		LINT: return super.lint(start, /<\s*\/\s*(pre)\b/giu);
	}
}
