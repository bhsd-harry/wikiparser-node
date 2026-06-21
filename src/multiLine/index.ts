import Parser from '../../index';
import {Token} from '../index';
import {gapped} from '../../mixin/gapped';
import type {AttributesToken, ExtToken} from '../../internal';

/**
 * extension tag that is parsed line by line
 *
 * 逐行解析的扩展标签
 */
@gapped()
export abstract class MultiLineToken extends Token {
	declare readonly name: string;

	abstract override get nextSibling(): undefined;
	abstract override get previousSibling(): AttributesToken | undefined;
	abstract override get parentNode(): ExtToken | undefined;

	override get type(): 'ext-inner' {
		return 'ext-inner';
	}

	/** @class */
	constructor(
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super(undefined, config, accum, acceptable);
		if (wikitext) {
			const newConfig = {...config, excludes: [...config.excludes, 'list']};
			this.safeAppend(wikitext.split('\n').map(line => new Token(line, newConfig, accum)));
		}
	}

	/** @private */
	override toString(skip?: boolean): string {
		return super.toString(skip, '\n');
	}

	/** @private */
	override text(): string {
		return super.text('\n').replace(/\n\s*\n/gu, '\n');
	}

	/** @private */
	override print(): string {
		PRINT: return super.print({sep: '\n'});
	}
}
