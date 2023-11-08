import * as Parser from '../index';
import ConverterToken = require('../src/converter');
import Token = require('../src');

/** 解析语言变体转换 */
const parseConverter = (wikitext: string, config = Parser.getConfig(), accum: Token[] = []): string => {
	const regex1 = /-\{/gu,
		regex2 = /-\{|\}-/gu,
		stack: RegExpExecArray[] = [];
	let regex = regex1,
		text = wikitext,
		mt = regex.exec(text);
	while (mt) {
		const {0: syntax, index} = mt;
		if (syntax === '}-') {
			const top = stack.pop()!,
				{length} = accum,
				str = text.slice(top.index + 2, index),
				i = str.indexOf('|'),
				[flags, raw] = i === -1 ? [[], str] : [str.slice(0, i).split(';'), str.slice(i + 1)],
				temp = raw.replace(/(&[#a-z\d]+);/giu, '$1\x01'), // eslint-disable-line regexp/prefer-lookaround
				variants = `(?:${config.variants.join('|')})`,
				rules = temp.split(new RegExp(`;(?=\\s*(?:${variants}|[^;]*?=>\\s*${variants})\\s*:)`, 'u'))
					.map(rule => rule.replaceAll('\x01', ';'));
			// @ts-expect-error abstract class
			new ConverterToken(flags, rules, config, accum);
			text = `${text.slice(0, top.index)}\0${length}v\x7F${text.slice(index + 2)}`;
			if (stack.length === 0) {
				regex = regex1;
			}
			regex.lastIndex = top.index + 3 + String(length).length;
		} else {
			stack.push(mt);
			regex = regex2;
			regex.lastIndex = index + 2;
		}
		mt = regex.exec(text);
	}
	return text;
};

Parser.parsers['parseConverter'] = __filename;
export = parseConverter;
