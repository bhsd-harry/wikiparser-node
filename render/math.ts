import {newline} from '../util/string';
import {parsers} from '../util/constants';
import {loadTexvcjs} from '../lib/document';
import type {TexvcReport} from '../lib/document';

export const texToSvg = (() => {
	const texvcjs = loadTexvcjs();
	if (!texvcjs) {
		return undefined;
	}
	try {
		const katex: typeof import('katex') = require('katex');
		require('katex/contrib/mhchem');
		return ([result,, tex]: [TexvcReport, number, string]): string => {
			if (result.status === '+') {
				tex = result.output;
				try {
					return newline(katex.renderToString(tex, {
						throwOnError: false,
						macros: {'\\mbox': String.raw`\text{#1}`},
					}));
				} catch {}
			}
			return `<strong class="error texerror">Failed to parse: ${
				tex.replaceAll(/\s/gu, ' ')
			}</strong>`;
		};
	} catch {
		return undefined;
	}
})();

parsers['texToSvg'] = __filename;
