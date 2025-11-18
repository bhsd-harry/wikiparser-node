import fs from 'fs';
import path from 'path';
import {parsers, states} from '../util/constants';
import {Shadow} from '../util/debug';
import {removeComment, removeCommentLine, tidy} from '../util/string';
import {expandedMagicWords, expandMagicWord} from './magicWords';
import {parseRedirect} from '../parser/redirect';
import Parser from '../index';
import {Token} from '../src/index';
import type {Config} from '../base';
import type {MagicWord} from './magicWords';
import type {
	CommentToken,
	IncludeToken,
	ArgToken,
	TranscludeToken,
	ParameterToken,
	OnlyincludeToken,
	TranslateToken,
	NoincludeToken,
	TvarToken,
	RedirectToken,
} from '../internal';

const blockElems = 'table|h1|h2|h3|h4|h5|h6|pre|p|ul|ol|dl',
	antiBlockElems = 'td|th',
	solvedMagicWords = new Set([
		'if',
		'ifeq',
		'ifexist',
		'iferror',
		'switch',
	]);
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
 * 隐式换行
 * @param str 字符串
 * @param prev 前一个字符
 */
const implicitNewLine = (str: string, prev: string): string =>
	prev + (prev !== '\n' && /^(?:\{\||[:;#*])/u.test(str) ? `\n${str}` : str);

/**
 * 加载模板
 * @param title 模板名
 * @param config
 */
const loadTemplate = (title: string, config: Config): string | false => {
	if (Parser.templates.has(title)) {
		return title;
	} else if (Parser.templateDir === undefined) {
		return false;
	} else if (!path.isAbsolute(Parser.templateDir)) {
		Parser.templateDir = path.join(__dirname, '..', '..', Parser.templateDir);
	}
	const file = fs.readdirSync(Parser.templateDir, {withFileTypes: true, recursive: true})
		.filter(dirent => dirent.isFile())
		.find(({name, parentPath}) => {
			const t = path.relative(
				Parser.templateDir!,
				path.join(parentPath, name.replace(/\.(?:wiki|txt)$/iu, '')),
			).replaceAll('꞉', ':');
			try {
				return decodeURIComponent(t) === title;
			} catch {
				return t === title;
			}
		});
	if (!file) {
		return false;
	}
	const content = tidy(fs.readFileSync(path.join(file.parentPath, file.name), 'utf8')),
		accum: Token[] = [],
		parsed = Shadow.run(() => parseRedirect(content, config, accum));
	if (parsed) {
		return loadTemplate((accum[0] as RedirectToken).lastChild.getTitle().title, config);
	}
	Parser.templates.set(title, content);
	return title;
};

/**
 * 清理已展开的节点
 * @param accum
 * @param tokens 要清理的节点
 */
const clean = (accum: Token[], tokens: Token | ParameterToken[]): void => {
	for (const t of Array.isArray(tokens) ? tokens.map(({lastChild}) => lastChild) : [tokens]) {
		// @ts-expect-error sparse array
		accum[accum.indexOf(t)] = undefined;
	}
};

/**
 * 展开模板
 * @param wikitext
 * @param page 页面名称
 * @param callPage 调用页面名称
 * @param config
 * @param include
 * @param context 模板调用环境
 * @param now 当前时间
 * @param accum
 * @param stack 模板调用栈
 */
const expand = (
	wikitext: string,
	page: string | undefined,
	callPage: string | undefined,
	config: Config,
	include: boolean,
	context?: TranscludeToken | false,
	now = Parser.now,
	accum: Token[] = [],
	stack: string[] = [],
): Token => {
	const n = accum.length,
		token = new Token(wikitext, {...config, inExt: true}, accum);
	token.type = 'root';
	token.pageName = page;
	token.parseOnce(0, include);
	if (context !== false) {
		for (const plain of [...accum.slice(n), token]) {
			if (plain.length !== 1 || plain.firstChild!.type !== 'text') {
				continue;
			}
			const {data} = plain.firstChild!;
			if (!/\0\d+g\x7F/u.test(data)) {
				continue;
			}
			const expanded = data.replace(/\0(\d+)g\x7F/gu, (_, i: number) => {
				const target = accum[i] as OnlyincludeToken | TranslateToken;
				if (target.type === 'onlyinclude') {
					clean(accum, target);
					return target.firstChild!.toString();
				}
				const {lastChild} = target;
				clean(accum, lastChild);
				return lastChild.firstChild!.toString().replace(
					/\0(\d+)c\x7F[\n ]|\0(\d+)n\x7F|^\n|\n$/gu,
					(m, p1?: number, p2?: number) => {
						if (p1 !== undefined) {
							const {innerText} = accum[p1] as CommentToken;
							return /^T:[^_/\n<>~]+$/u.test(innerText) ? '' : m;
						} else if (p2 !== undefined) {
							const {type} = accum[p2] as IncludeToken | NoincludeToken | TvarToken;
							return type === 'tvar' ? '' : m;
						}
						return '';
					},
				);
			});
			plain.setText(expanded);
		}
		token.setText(removeCommentLine(token.firstChild!.toString(), true));
	}
	token.parseOnce();
	for (const plain of [...accum.slice(n), token] as (Token | undefined)[]) {
		if (!plain || plain.length !== 1 || plain.firstChild!.type !== 'text') {
			continue;
		}
		const {data} = plain.firstChild!;
		if (!/\0\d+[tm!{}+~-]\x7F/u.test(data)) {
			continue;
		}
		const expanded = data.replace(
			/([^\x7F]?)\0(\d+)[tm!{}+~-]\x7F/gu,
			(m, prev: string, i: number) => {
				const target = accum[i] as ArgToken | TranscludeToken,
					{type, name, length, firstChild: f, childNodes} = target,
					isTemplate = type === 'template',
					args = childNodes.slice(1) as ParameterToken[];
				if (type === 'arg') {
					const arg = removeCommentLine(f.toString()).trim();
					if (/\0\d+[tm!{}+~-]\x7F/u.test(arg)) {
						return m;
					} else if (!context || !context.hasArg(arg)) {
						const effective = target.childNodes[1] ?? target;
						clean(accum, length === 1 ? f : effective);
						return prev + effective.toString();
					}
					clean(accum, context.getArg(arg)!.lastChild);
					return prev + context.getValue(arg)!;
				} else if (isTemplate || name === 'int') {
					if (context === false) {
						return m;
					}
					const nameToken = isTemplate ? f : args[0]!.lastChild,
						key = removeComment(nameToken.toString()),
						fallback = isTemplate ? m : `${prev}⧼${key}⧽`,
						{title, valid} = Parser.normalizeTitle(
							(isTemplate ? '' : 'MediaWiki:') + key,
							10,
							include,
							config,
							{halfParsed: true, temporary: true, page},
						);
					if (!valid) {
						clean(accum, nameToken);
						if (isTemplate) {
							clean(accum, args);
							return prev + target.toString();
						}
						return fallback;
					}
					const dest = loadTemplate(title, config);
					if (dest === false) {
						if (!isTemplate) {
							clean(accum, nameToken);
						}
						return fallback;
					} else if (stack.includes(dest)) {
						return `${prev}<span class="error">Template loop detected: [[${dest}]]</span>`;
					}
					let template = Parser.templates.get(dest)!.replace(/\n$/u, '');
					if (!isTemplate) {
						for (let j = 1; j < args.length; j++) {
							template = template.replaceAll(`$${j}`, removeComment(args[j]!.toString()));
						}
					}
					return implicitNewLine(
						expand(template, dest, callPage, config, true, target, now, accum, [...stack, dest])
							.toString(),
						prev,
					);
				} else if (context === false && !solvedMagicWords.has(name)) {
					return m;
				} else if (Parser.functionHooks.has(name)) {
					clean(accum, args);
					return implicitNewLine(Parser.functionHooks.get(name)!(target, context || undefined), prev);
				} else if (expandedMagicWords.has(name)) {
					const result = expandMagicWord(
						name as MagicWord,
						args.map(({anon, name: key, value}) => anon ? value : `${key}=${value}`),
						callPage,
						config,
						now,
						accum,
					);
					if (result === false) {
						return m;
					}
					clean(accum, args);
					return implicitNewLine(result, prev);
				}
				return m;
			},
		);
		plain.setText(expanded);
		if (plain.type === 'parameter-key') {
			(plain.parentNode as ParameterToken).trimName(removeCommentLine(expanded));
		}
	}
	return token;
};

/**
 * 展开指定节点的模板
 * @param token 目标节点
 * @param context 模板调用环境
 */
export const expandToken = (token: Token, context?: false): Token => {
	const {pageName} = token;
	return expand(
		token.toString(),
		pageName,
		pageName,
		token.getAttribute('config'),
		token.getAttribute('include'),
		context,
	);
};

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

parsers['expandToken'] = __filename;
