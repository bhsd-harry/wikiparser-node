import {newline} from '../util/string';
import {loadTexvcjs} from '../lib/document';

export const texToSvg = (() => {
	const texvcjs = loadTexvcjs();
	if (!texvcjs) {
		return undefined;
	}
	try {
		const katex: typeof import('katex') = require('katex');
		require('katex/contrib/mhchem');
		return (tex: string, usemhchem: boolean): string => {
			const result = texvcjs.check(tex, {usemathrm: true, usemhchem});
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
