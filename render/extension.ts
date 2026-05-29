import {parsers, states} from '../util/constants';
import {newline, sanitizeId, sanitizeAttr} from '../util/string';
import type {ExtToken, GalleryToken, Token} from '../internal';

/** @ignore */
const getCiteNoteId = (i: number, refName?: string): string =>
		`cite_note${refName ? `-${sanitizeAttr(refName, true)}` : ''}-${i}`,
	getCiteRefId = (i: number, count: number, refName?: string): string =>
		`cite_ref-${refName ? `${sanitizeAttr(refName, true)}_${i}-${count - 1}` : i}`,
	updateRef = (ref: RefState, content: Token, dir?: 'ltr' | 'rtl'): void => {
		if (!ref.content) {
			ref.content = content;
			ref.dir = dir;
		}
	};

/**
 * 将扩展标签渲染为HTML
 * @param token 扩展标签节点
 * @param opt 渲染选项
 */
export const renderExt = (token: ExtToken, opt?: Omit<HtmlOpt, 'nowrap'>): string => {
	const {name, firstChild, lastChild} = token;
	switch (name) {
		case 'nowiki': {
			const html = lastChild.toHtmlInternal();
			return token.closest('ext-inner')?.name === 'poem' ? html : newline(html);
		}
		case 'pre': {
			const html = lastChild.toHtmlInternal({
				...opt,
				nowrap: false,
			});
			return `<pre${firstChild.toHtmlInternal()}>${
				token.closest('ext-inner')?.name === 'poem' ? html : newline(html)
			}</pre>`;
		}
		case 'langconvert':
			return lastChild.toHtmlInternal({...opt, nowrap: true});
		case 'poem': {
			const padding = firstChild.hasAttr('compact') ? '' : '\n';
			firstChild.classList.add('poem');
			return `<div${firstChild.toHtmlInternal()}>${padding}${
				lastChild.toHtmlInternal({...opt, nowrap: false})
					.replaceAll(/(?<!^|<hr>)\n(?!$)/gu, '<br>\n')
					.replaceAll(/^ +/gmu, p => '&nbsp;'.repeat(p.length))
					.trim()
			}${padding}</div>`;
		}
		case 'gallery': {
			const caption = firstChild.getAttrToken('caption'),
				perrow = parseInt(firstChild.getAttr('perrow') || ''),
				{classList} = firstChild,
				nolines = firstChild.getAttr('mode')?.toLowerCase() === 'nolines',
				padding = nolines ? 9 : 43;
			classList.add('gallery');
			if (nolines) {
				classList.add('mw-gallery-nolines');
			}
			if (perrow > 0) {
				firstChild.setAttr(
					'style',
					`max-width: ${
						((lastChild as GalleryToken).widths + padding) * perrow
					}px;${firstChild.getAttr('style') || ''}`,
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
			if (lexer) {
				const {Prism, loadLanguage}: typeof import('./syntaxhighlight') = require('./syntaxhighlight');
				lexer = lexer.toLowerCase();
				if (Prism) {
					try {
						lexer = loadLanguage(lexer);
						html = Prism.highlight(
							lastChild.childNodes.map(
								child => child.is('ext') && child.name === 'nowiki'
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
					lines = highlight && new Set(
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
						if (startAttr) {
							start = Number(startAttr);
							if (!Number.isInteger(start) || start < 0) {
								start = 1;
							}
						}
						if (linelinks) {
							lineReplace = `<a href="#${sanitizeId(linelinks)}-$1">${lineReplace}</a>`;
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
		case 'ref': {
			const refs = states.get(token.getRootNode())?.refs;
			if (!refs) {
				return '';
			}
			const text = token.innerText?.trim(),
				references = token.closest<ExtToken>('ext#references');
			let refName = firstChild.getAttr('name') || '',
				dir = firstChild.getAttr('dir')?.toLowerCase();
			if (!/\D/u.test(refName)) {
				refName = '';
			}
			if (dir !== 'ltr' && dir !== 'rtl') {
				dir = undefined;
			}
			if (references) {
				const referencesGroup = refs.get(references.getAttr('group') || '')!;
				if (refName && text) {
					const ref = referencesGroup.find(({name: n}) => n === refName);
					if (ref) {
						updateRef(ref, lastChild, dir);
					}
				}
				return '';
			} else if (!refName && !text || text && /<references\b[^>]*>/iu.test(text)) {
				return '';
			} else if (text && /<ref\b[^>]*>/iu.test(text)) {
				const inner = lastChild.cloneNode();
				for (const ref of inner.querySelectorAll<ExtToken>('ext#ref')) {
					ref.remove();
				}
				if (/<ref\b[^>]*>/iu.test(inner.toString())) {
					return '';
				}
			}
			const group = firstChild.getAttr('group') || '';
			if (!refs.has(group)) {
				refs.set(group, []);
			}
			const referencesGroup = refs.get(group)!;
			let i = refName ? referencesGroup.findIndex(({name: n}) => n === refName) : -1,
				count = 1,
				ref: RefState;
			if (i === -1) {
				i = referencesGroup.length;
				ref = {
					...refName && {name: refName},
					...text && {content: lastChild},
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					dir: dir as 'ltr' | 'rtl' | undefined,
					count,
					id: ++refs.id,
				};
				referencesGroup.push(ref);
			} else {
				ref = referencesGroup[i]!;
				ref.count++;
				({count} = ref);
				if (text) {
					updateRef(ref, lastChild, dir);
				}
			}
			return `<sup id="${getCiteRefId(ref.id, count, refName)}" class="reference"><a href="#${
				getCiteNoteId(ref.id, refName)
			}"><span class="cite-bracket">[</span>${group}${group && ' '}${
				i + 1
			}<span class="cite-bracket">]</span></a></sup>`;
		}
		case 'references': {
			const refs = states.get(token.getRootNode())?.refs;
			if (!refs) {
				return '';
			}
			const group = firstChild.getAttr('group') || '';
			if (!refs.has(group)) {
				return '';
			}
			const html = lastChild.toHtmlInternal(),
				referencesGroup = refs.get(group);
			if (!referencesGroup) {
				return html;
			}
			if (referencesGroup.length === 0) {
				return '';
			}
			let ol = `<ol class="references"${group && ` data-mw-group="${group}"`}>`;
			for (let i = 0; i < referencesGroup.length; i++) {
				const {content, count, dir, name: refName, id} = referencesGroup[i]!;
				ol += `\n<li id="${getCiteNoteId(id, refName)}"${
					dir ? ` class="mw-cite-dir-${dir}"` : ''
				}><span class="mw-cite-backlink">${
					count === 1
						? `<a href="#${getCiteRefId(id, 1, refName)}">↑</a>`
						: `↑${
							Array.from(
								{length: count},
								(_, j) => ` <sup><a href="#${
									getCiteRefId(id, j + 1, refName)
								}">${i + 1}.${j}</a></sup>`,
							).join('')
						}`
				}</span> <span class="reference-text">${content?.toHtmlInternal() ?? ''}</span>\n</li>`;
			}
			ol += '\n</ol>';
			refs.delete(group);
			return firstChild.getAttr('responsive') === '0'
				? ol
				: `<div class="mw-references-wrap${
					referencesGroup.length > 10 ? ' mw-references-columns' : ''
				}">${ol}</div>`;
		}
		default:
			return '';
	}
};

parsers['renderExt'] = __filename;
