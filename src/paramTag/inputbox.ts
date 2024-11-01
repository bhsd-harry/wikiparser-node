import {parseBraces} from '../../parser/braces';
import Parser from '../../index';
import {ParamTagToken} from './index';
import {CommentToken} from '../nowiki/comment';
import type {Config} from '../../base';
import type {Token} from '../index';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';

/* NOT FOR BROWSER END */

/**
 * 解析注释
 * @param wikitext 维基文本
 * @param config
 * @param accum
 */
const parseComment = (wikitext: string, config: Config, accum: Token[]): string => wikitext.replace(
	/<!--.*?(?:-->|$)/gsu,
	comment => {
		const str = `\0${accum.length + 1}c\x7F`,
			closed = comment.endsWith('-->');
		// @ts-expect-error abstract class
		new CommentToken(comment.slice(4, closed ? -3 : undefined), closed, config, accum);
		return str;
	},
);

/** `<inputbox>` */
export abstract class InputboxToken extends ParamTagToken {
	/** @class */
	constructor(wikitext?: string, config = Parser.getConfig(), accum: Token[] = []) {
		wikitext &&= parseComment(wikitext, config, accum);
		const placeholder = Symbol('InputboxToken'),
			{length} = accum;
		accum.push(placeholder as unknown as Token);
		wikitext &&= parseBraces(wikitext, config, accum);
		accum.splice(length, 1);
		super(wikitext, config, accum, {
			CommentToken: ':', ArgToken: ':', TranscludeToken: ':',
		});
	}
}

classes['InputboxToken'] = __filename;
