import Parser from '../index';
import {RedirectToken} from '../src/redirect';
import type {Config} from '../base';
import type {Token} from '../src/index';

/**
 * 解析重定向
 * @param text
 * @param config
 * @param accum
 */
export const parseRedirect = (text: string, config: Config, accum: Token[]): string | false => {
	const re = new RegExp(String.raw`^(\s*)((?:${
			config.redirection.join('|')
		})\s*(?::\s*)?)\[\[([^\n|\]]+)(\|.*?)?\]\](\s*)`, 'iu'),
		mt = re.exec(text);
	if (mt && Parser.normalizeTitle(mt[3]!, 0, false, config, true, true).valid) {
		text = `\0${accum.length}c\x7F${text.slice(mt[0].length)}`;
		// @ts-expect-error abstract class
		new RedirectToken(...mt.slice(1), config, accum);
		return text;
	}
	return false;
};
