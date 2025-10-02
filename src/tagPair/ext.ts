import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {attributesParent} from '../../mixin/attributesParent';
import {Token} from '../index';
import {TagPairToken} from './index';
import {AttributesToken} from '../attributes';
import type {LintError, Config} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {newline} from '../../util/string';
import {cached} from '../../mixin/cached';
import type {GalleryToken} from '../../internal';

/* NOT FOR BROWSER END */

export interface ExtToken extends AttributesParentBase {}

/**
 * extension tag
 *
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, Token]}`
 */
@attributesParent()
export abstract class ExtToken extends TagPairToken {
	declare closed: true;

	declare readonly childNodes: readonly [AttributesToken, Token];
	abstract override get firstChild(): AttributesToken;
	abstract override get lastChild(): Token;

	/* NOT FOR BROWSER */

	abstract override get children(): [AttributesToken, Token];
	abstract override get firstElementChild(): AttributesToken;

	/* NOT FOR BROWSER END */

	override get type(): 'ext' {
		return 'ext';
	}

	/**
	 * @param name 标签名
	 * @param attr 标签属性
	 * @param inner 内部wikitext
	 * @param closed 是否封闭
	 * @param include 是否嵌入
	 */
	constructor(
		name: string,
		attr?: string,
		inner?: string,
		closed?: string,
		config = Parser.getConfig(),
		include = false,
		accum: Token[] = [],
	) {
		const lcName = name.toLowerCase(),
			// @ts-expect-error abstract class
			attrToken: AttributesToken = new AttributesToken(
				!attr || /^\s/u.test(attr) ? attr : ` ${attr}`,
				'ext-attrs',
				lcName,
				config,
				accum,
			),
			newConfig: Config = {
				...config,
				ext: config.ext.filter(e => e !== lcName),
				excludes: [...config.excludes],
				inExt: true,
			};
		let innerToken: Token;
		switch (lcName) {
			case 'tab':
				newConfig.ext = newConfig.ext.filter(e => e !== 'tabs');
				// fall through
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'option':
			case 'combooption':
			case 'tabs':
			case 'poll':
			case 'seo':
			case 'langconvert':
			case 'phonos':
				if (lcName === 'poem') {
					newConfig.excludes.push('heading');
				}
				innerToken = new Token(inner, newConfig, accum);
				break;
			case 'pre': {
				const {PreToken}: typeof import('../pre') = require('../pre');
				// @ts-expect-error abstract class
				innerToken = new PreToken(inner, newConfig, accum);
				break;
			}
			case 'dynamicpagelist': {
				const {ParamTagToken}: typeof import('../multiLine/paramTag') = require('../multiLine/paramTag');
				// @ts-expect-error abstract class
				innerToken = new ParamTagToken(include, inner, newConfig, accum);
				break;
			}
			case 'inputbox': {
				const {InputboxToken}: typeof import('../multiLine/inputbox') = require('../multiLine/inputbox');
				// @ts-expect-error abstract class
				innerToken = new InputboxToken(include, inner, newConfig, accum);
				break;
			}
			case 'references': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof import('../nested') = require('../nested');
				newConfig.excludes.push('heading');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(inner, include, ['ref'], newConfig, accum);
				break;
			}
			case 'choose': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(option|choicetemplate)(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/(\1)>)/gu,
					['option', 'choicetemplate'],
					newConfig,
					accum,
				);
				break;
			}
			case 'combobox': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(combooption)(\s[^>]*?)?(?:\/>|>([\s\S]*?)<\/(combooption\s*)>)/giu,
					['combooption'],
					newConfig,
					accum,
				);
				break;
			}
			case 'gallery': {
				const {GalleryToken}: typeof import('../multiLine/gallery') = require('../multiLine/gallery');
				// @ts-expect-error abstract class
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'imagemap': {
				const {ImagemapToken}: typeof import('../multiLine/imagemap') = require('../multiLine/imagemap');
				// @ts-expect-error abstract class
				innerToken = new ImagemapToken(inner, newConfig, accum);
				break;
			}
			case 'hiero': {
				const {CommentedToken}: typeof import('../commented') = require('../commented');
				// @ts-expect-error abstract class
				innerToken = new CommentedToken(inner, newConfig, accum);
				break;
			}
			// 更多定制扩展的代码示例：
			// ```
			// case 'extensionName': {
			//   const {ExtensionToken}: typeof import('../extension') = require('../extension');
			//   innerToken = new ExtensionToken(inner, newConfig, accum);
			//   break;
			// }
			// ```
			default: {
				const {NowikiToken}: typeof import('../nowiki/index') = require('../nowiki/index');
				// @ts-expect-error abstract class
				innerToken = new NowikiToken(inner, newConfig, accum);
			}
		}
		innerToken.setAttribute('name', lcName);
		if (innerToken.type === 'plain') {
			innerToken.type = 'ext-inner';
		}
		super(name, attrToken, innerToken, closed, config, accum);

		/* PRINT ONLY */

		this.seal('closed', true);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{lintConfig} = Parser,
				rect = new BoundingRect(this, start);
			if (this.name !== 'nowiki') {
				const s = this.inHtmlAttrs(),
					rule = 'parsing-order',
					severity = s && lintConfig.getSeverity(rule, s === 2 ? 'ext' : 'templateInTable');
				if (severity) {
					errors.push(generateForSelf(this, rect, rule, 'ext-in-html', severity));
				}
			}
			if (this.name === 'ref') {
				let rule: LintError.Rule = 'var-anchor',
					s = lintConfig.getSeverity(rule, 'ref');
				if (s && this.closest('heading-title')) {
					errors.push(generateForSelf(this, rect, rule, 'variable-anchor', s));
				}
				rule = 'nested-link';
				s = lintConfig.getSeverity(rule, 'ref');
				if (s && this.closest('link,ext-link-text')) {
					errors.push(generateForSelf(this, rect, rule, 'ref-in-link', s));
				}
			}
			return errors;
		}
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const inner = this.lastChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			include = this.getAttribute('include'),
			closed = this.selfClosing ? undefined : tags[1],
			attr = this.firstChild.toString();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ExtToken(tags[0], attr, '', closed, config, include);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		const {name, firstChild, lastChild} = this;
		if (Parser.tagHooks.has(name)) {
			return Parser.tagHooks.get(name)!(this);
		}
		switch (name) {
			case 'nowiki': {
				const html = lastChild.toHtmlInternal();
				return this.closest('ext#poem') ? html : newline(html);
			}
			case 'pre': {
				const html = lastChild.toHtmlInternal({
					...opt,
					nowrap: false,
				});
				return `<pre${firstChild.toHtmlInternal()}>${
					this.closest('ext#poem') ? html : newline(html)
				}</pre>`;
			}
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
					nolines = typeof mode === 'string' && mode.toLowerCase() === 'nolines',
					padding = nolines ? 9 : 43;
				firstChild.classList.add('gallery');
				if (nolines) {
					firstChild.classList.add('mw-gallery-nolines');
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
			default:
				return '';
		}
	}
}

classes['ExtToken'] = __filename;
