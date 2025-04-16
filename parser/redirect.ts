import Parser from '../index';
import {RedirectToken} from '../src/redirect';
import type {Config} from '../base';
import type {Token} from '../internal';

/**
 * 解析重定向
 * @param text
 * @param config
 * @param accum
 */
export const parseRedirect = (text: string, config: Config, accum: Token[]): string | false => {
	config.regexRedirect ??= new RegExp(String.raw`^(\s*)((?:${
		config.redirection.join('|')
	})\s*(?::\s*)?)\[\[([^\n|\]]+)(\|.*?)?\]\](\s*)`, 'iu');
	const mt = config.regexRedirect.exec(text);
	if (
		mt
		&& Parser.normalizeTitle(
			mt[3]!,
			0,
			false,
			config,
			{halfParsed: true, temporary: true, decode: true},
		).valid
	) {
		text = `\0${accum.length}o\x7F${text.slice(mt[0].length)}`;
		// @ts-expect-error abstract class
		new RedirectToken(...mt.slice(1), config, accum);
		return text;
	}
	return false;
};
