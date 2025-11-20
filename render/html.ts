import {states, parsers} from '../util/constants';
import type {Token} from '../internal';

const blockElems = 'table|h1|h2|h3|h4|h5|h6|pre|p|ul|ol|dl',
	antiBlockElems = 'td|th';
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:table|\/(?:td|th)|\/?(?:tr|caption|dt|dd|li))\b/iu;
const openRegex = new RegExp(
	String.raw`<(?:${blockElems}|\/(?:${antiBlockElems})|\/?(?:tr|caption|dt|dd|li))\b`,
	'iu',
);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:\/(?:h1|h2)|td|th|\/?(?:center|blockquote|div|hr|figure))\b/iu;
const closeRegex = new RegExp(
	String.raw`<(?:\/(?:${blockElems})|${antiBlockElems}|\/?(?:center|blockquote|div|hr|figure))\b`,
	'iu',
);

/**
 * 将展开后的节点转换为HTML
 * @param token 展开后的节点
 */
export const toHtml = (token: Token): string => {
	states.set(token, {headings: new Set(), categories: new Set()});
	const lines = token.toHtmlInternal().split('\n');
	let output = '',
		inBlockElem = false,
		pendingPTag: string | false = false,
		inBlockquote = false,
		lastParagraph = '';
	const /** @ignore */ closeParagraph = (): string => {
		if (lastParagraph) {
			const result = `</${lastParagraph}>\n`;
			lastParagraph = '';
			return result;
		}
		return '';
	};
	for (let line of lines) {
		const openMatch = openRegex.test(line),
			closeMatch = closeRegex.test(line);
		if (openMatch || closeMatch) {
			const blockquote = /<(\/?)blockquote[\s>](?!.*<\/?blockquote[\s>])/iu.exec(line)?.[1];
			inBlockquote = blockquote === undefined ? inBlockquote : !blockquote;
			pendingPTag = false;
			output += closeParagraph();
			inBlockElem = !closeMatch;
		} else if (!inBlockElem) {
			if (line.startsWith(' ') && (lastParagraph === 'pre' || line.trim()) && !inBlockquote) {
				if (lastParagraph !== 'pre') {
					pendingPTag = false;
					output += `${closeParagraph()}<pre>`;
					lastParagraph = 'pre';
				}
				line = line.slice(1);
			} else if (/^(?:<link\b[^>]*>\s*)+$/iu.test(line)) {
				if (pendingPTag) {
					output += closeParagraph();
					pendingPTag = false;
				}
			} else if (!line.trim()) {
				if (pendingPTag) {
					output += `${pendingPTag}<br>`;
					pendingPTag = false;
					lastParagraph = 'p';
				} else if (lastParagraph === 'p') {
					pendingPTag = '</p><p>';
				} else {
					output += closeParagraph();
					pendingPTag = '<p>';
				}
			} else if (pendingPTag) {
				output += pendingPTag;
				pendingPTag = false;
				lastParagraph = 'p';
			} else if (lastParagraph !== 'p') {
				output += `${closeParagraph()}<p>`;
				lastParagraph = 'p';
			}
		}
		if (!pendingPTag) {
			output += `${line}\n`;
		}
	}
	output += closeParagraph();
	const {categories} = states.get(token)!;
	states.delete(token);
	let html = output.trimEnd();
	if (categories.size > 0) {
		html += `
<div id="catlinks" class="catlinks"><div><a href="${
	token.normalizeTitle('Special:Categories', -1, {temporary: true}).getUrl()
}" title="Special:Categories">Categories</a>: <ul>${
	[...categories].map(catlink => `<li>${catlink}</li>`).join('')
}</div></div>`;
	}
	return html;
};

parsers['toHtml'] = __filename;
