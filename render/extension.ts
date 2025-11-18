/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {parsers} from '../util/constants';
import {newline} from '../util/string';
import type {ExtToken, GalleryToken} from '../internal';

/**
 * 将扩展标签渲染为HTML
 * @param token 扩展标签节点
 * @param opt 渲染选项
 */
export const renderExt = (token: ExtToken, opt?: Omit<HtmlOpt, 'nowrap'>): string => {
	const {name, firstChild, lastChild} = token;
	switch (name) {
		case 'poem': {
			const padding = firstChild.hasAttr('compact') ? '' : '\n';
			firstChild.classList.add('poem');
			return `<div${firstChild.toHtmlInternal()}>${padding}${
				lastChild.toHtmlInternal({...opt, nowrap: false})
					.replace(/(?<!^|<hr>)\n(?!$)/gu, '<br>\n')
					.replace(/^ +/gmu, p => '&nbsp;'.repeat(p.length))
					.trim()
			}${padding}</div>`;
		}
		case 'gallery': {
			const caption = firstChild.getAttrToken('caption'),
				perrow = parseInt(String(firstChild.getAttr('perrow'))),
				mode = firstChild.getAttr('mode'),
				{classList} = firstChild,
				nolines = typeof mode === 'string' && mode.toLowerCase() === 'nolines',
				padding = nolines ? 9 : 43;
			classList.add('gallery');
			if (nolines) {
				classList.add('mw-gallery-nolines');
			}
			if (perrow > 0) {
				const style = firstChild.getAttr('style');
				firstChild.setAttr(
					'style',
					`max-width: ${
						((lastChild as GalleryToken).widths + padding) * perrow
					}px;${typeof style === 'string' ? style : ''}`,
				);
			}
			return `<ul${firstChild.toHtmlInternal()}>\n${
				caption
					? `\t<li class="gallerycaption">${caption.lastChild.toHtmlInternal({nowrap: true})}</li>\n`
					: ''
			}${lastChild.toHtmlInternal()}\n</ul>`;
		}
		case 'syntaxhighlight':
		case 'source': {
			let html = lastChild.toHtmlInternal().trimEnd().replace(/^\n+/u, ''),
				lexer = firstChild.getAttr('lang');
			const dir = firstChild.getAttr('dir') === 'rtl' ? ' rtl' : 'ltr',
				isInline = firstChild.getAttr('enclose') === 'none' || firstChild.hasAttr('inline'),
				showLines = firstChild.hasAttr('line'),
				{classList} = firstChild;
			classList.add('mw-highlight');
			if (lexer && lexer !== true) {
				const {Prism, loadLanguage}: typeof import('./syntaxhighlight') = require('./syntaxhighlight');
				lexer = lexer.toLowerCase();
				if (Prism) {
					try {
						lexer = loadLanguage(lexer);
						html = Prism.highlight(
							lastChild.childNodes.map(
								child => child.is<ExtToken>('ext') && child.name === 'nowiki'
									? child.innerText ?? ''
									: child.toString(),
							).join().trimEnd().replace(/^\n+/u, ''),
							Prism.languages[lexer]!,
							lexer,
						);
						classList.add(`mw-highlight-lang-${lexer.toLowerCase()}`);
					} catch {}
				}
				const highlight = firstChild.getAttr('highlight'),
					lines = typeof highlight === 'string' && new Set(
						highlight.split(',').flatMap((str): number | number[] => {
							const num = Number(str);
							if (Number.isInteger(num) && num > 0) {
								return num;
							} else if (!str.includes('-')) {
								return [];
							}
							const [start, end] = str.split('-')
								.map(s => parseInt(s)) as [number, number];
							return start > 0 && start < end
								? Array.from({length: end - start + 1}, (_, i) => i + start)
								: [];
						}),
					),
					linenos = showLines && !isInline;
				if (linenos || lines && lines.size > 0) {
					let lineReplace: string | undefined,
						begin = '',
						end = '',
						start = 1;
					if (linenos) {
						const linelinks = firstChild.getAttr('linelinks'),
							startAttr = firstChild.getAttr('start');
						lineReplace = '<span class="linenos" data-line="$1"></span>';
						if (startAttr && startAttr !== true) {
							start = Number(startAttr);
							if (!Number.isInteger(start) || start < 0) {
								start = 1;
							}
						}
						if (linelinks && linelinks !== true) {
							lineReplace = `<a href="#${linelinks}-$1">${lineReplace}</a>`;
							begin = `${linelinks}-`;
							end = '</span>';
						}
					}
					const re = /<\/?span\b[^>]*>|\n/gu,
						stack: string[] = [],

						/**
						 * 是否高亮
						 * @param i 行号
						 * @param close 闭合标签
						 */
						f = (i: number, close?: boolean): string => {
							if (!lines || !lines.has(i)) {
								return '';
							}
							return close ? '</span>' : '<span class="hll">';
						},

						/**
						 * 是否添加id属性
						 * @param i 行号
						 */
						g = (i: number): string => begin && `<span id="${begin}${i}">`;
					let mt = re.exec(html),
						i = 1,
						lastIndex = 0,
						output = g(i) + f(1) + (lineReplace?.replaceAll('$1', String(start)) ?? '');
					while (mt) {
						if (mt[0] === '\n') {
							output += `${html.slice(lastIndex, mt.index)}${'</span>'.repeat(stack.length)}\n${
								f(i, true)
							}${end}${g(i + 1)}${f(i + 1)}${
								lineReplace?.replaceAll('$1', String(i + start)) ?? ''
							}${stack.join('')}`;
							i++;
							({lastIndex} = re);
						} else if (mt[0].startsWith('</')) {
							stack.pop();
						} else {
							stack.push(mt[0]);
						}
						mt = re.exec(html);
					}
					html = output + html.slice(lastIndex) + f(i, true) + end;
				}
			}
			classList.add(`mw-content-${dir}`);
			if (showLines) {
				classList.add('mw-highlight-lines');
			}
			if (!isInline && firstChild.hasAttr('copy')) {
				classList.add('mw-highlight-copy');
			}
			firstChild.setAttr('dir', dir);
			for (const attr of ['style', 'class', 'id', 'dir']) {
				firstChild.getAttrToken(attr)?.asHtmlAttr();
			}
			return isInline
				? `<code${firstChild.toHtmlInternal()}>${
					html.trim().replaceAll('\n', ' ')
				}</code>`
				: `<div${firstChild.toHtmlInternal()}>${html && `<pre>${newline(html)}</pre>`}</div>`;
		}
		default:
			return '';
	}
};

parsers['renderExt'] = __filename;
