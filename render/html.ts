import {states, parsers} from '../util/constants';
import type {Token, DoubleUnderscoreToken, HeadingToken, HtmlToken} from '../internal';

const blockElems = 'table|h[1-6]|pre|p|[uod]l',
	antiBlockElems = 't[dh]',
	allowed = new Set(['sup', 'sub', 'bdi', 'i', 'b', 's', 'strike', 'q']),
	tocContainer = '<div id="toc" class="toc" role="navigation" aria-labelledby="mw-toc-heading">'
		+ '<div class="toctitle"><h2 id="mw-toc-heading">Contents</h2></div>';
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:table|\/t[dh]|\/?(?:tr|caption|d[td]|li))\b/iu;
const openRegex = new RegExp(
	String.raw`<(?:${blockElems}|\/${antiBlockElems}|\/?(?:tr|caption|d[td]|li))\b`,
	'iu',
);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/<(?:\/(?:pre|p)|t[dh]|\/?(?:center|blockquote|div|hr|figure))\b/iu;
const closeRegex = new RegExp(
	String.raw`<(?:\/(?:${blockElems})|${antiBlockElems}|\/?(?:center|blockquote|div|hr|figure))\b`,
	'iu',
);

/**
 * 将展开后的节点转换为HTML
 * @param token 展开后的节点
 */
export const toHtml = (token: Token): string => {
	states.set(token, {headings: new Set(), categories: new Set(), refs: new Map()});

	// 前处理引用
	const hasCite = token.getAttribute('config').ext.includes('references');
	if (hasCite) {
		token.append('\n', token.createElement('references', {selfClosing: true}));
	}

	// 处理目录
	const tocSwitch = token.querySelector<DoubleUnderscoreToken>('double-underscore#toc'),
		forcetoc = tocSwitch || token.querySelector<DoubleUnderscoreToken>('double-underscore#forcetoc'),
		tocData: [number, string, string][] = [];
	if (forcetoc || !token.querySelector<DoubleUnderscoreToken>('double-underscore#notoc')) {
		const headings = token.querySelectorAll<HeadingToken | HtmlToken>(
			'heading,html#h1,html#h2,html#h3,html#h4,html#h5,html#h6',
		);
		let firstHeading: HeadingToken | HtmlToken | undefined;
		for (const heading of headings) {
			if (heading.type === 'heading') {
				tocData.push([heading.level, heading.getRenderedId(), heading.firstChild.toHtmlInternal().trim()]);
				firstHeading ??= heading;
			} else {
				const tocLine = heading.getTocLine();
				if (tocLine) {
					tocData.push([Number(heading.name.slice(1)), ...tocLine]);
					firstHeading ??= heading;
				}
			}
		}
		const {length} = tocData;
		if (forcetoc && length || length > 3) {
			const levels: number[] = [],
				tocNumbers: number[] = [];
			let toc = tocContainer,
				i = 0;
			for (const [level, id, text] of tocData) {
				const n = levels.length;
				let j = levels.findIndex(l => l >= level),
					prefix: string;
				if (j === -1) {
					j = n;
					prefix = '\n<ul>';
					levels.push(level);
					tocNumbers.push(1);
				} else {
					prefix = `${'</li>\n</ul>\n'.repeat(n - j - 1)}</li>`;
					levels.splice(j, Infinity, level);
					tocNumbers.length = j + 1;
					tocNumbers[j]!++;
				}
				toc += `${prefix}\n<li class="toclevel-${j + 1} tocsection-${++i}"><a href="#${
					id
				}"><span class="tocnumber">${tocNumbers.join('.')}</span> <span class="toctext">${
					text.replaceAll(
						/<(\/?)([a-z]\w*)\b.*?>/gu,
						(_, slash: string, tag: string) => allowed.has(tag) ? `<${slash}${tag}>` : '',
					).trim()
				}</span></a>`;
			}
			toc = i === 0 ? '' : `${toc}${'</li>\n</ul>\n'.repeat(levels.length)}</div>\n`;
			if (tocSwitch) {
				tocSwitch.tocData = toc;
			} else {
				firstHeading!.tocData = toc;
			}
		}
	}

	// 后处理引用
	const lines = token.toHtmlInternal().split('\n');
	if (hasCite && lines.at(-1) === '') {
		lines.pop();
	}

	// 处理正文
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
	let html = output.trimEnd();

	// 处理分类
	const {categories} = states.get(token)!;
	states.delete(token);
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
