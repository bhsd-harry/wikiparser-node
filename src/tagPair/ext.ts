import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {Token} from '../index';
import {TagPairToken} from './index';
import {AttributesToken} from '../attributes';
import {PreToken} from '../pre';
import {ParamTagToken} from '../paramTag/index';
import {InputboxToken} from '../paramTag/inputbox';
import {GalleryToken} from '../gallery';
import {ImagemapToken} from '../imagemap';
import {NowikiToken} from '../nowiki/index';
import type {LintError, Config} from '../../base';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {classes} from '../../util/constants';
import {newline} from '../../util/string';
import {font} from '../../util/html';
import {attributesParent} from '../../mixin/attributesParent';
import type {AttributesParentBase} from '../../mixin/attributesParent';

export interface ExtToken extends AttributesParentBase {}

/* NOT FOR BROWSER END */

/**
 * 从数组中删除指定元素
 * @param arr 数组
 * @param ele 元素
 */
const del = <T>(arr: readonly T[], ele: T): T[] => {
	const set = new Set(arr);
	set.delete(ele);
	return [...set];
};

/**
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
	 */
	constructor(
		name: string,
		attr?: string,
		inner?: string,
		closed?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		const lcName = name.toLowerCase(),
			// @ts-expect-error abstract class
			attrToken: AttributesToken = new AttributesToken(
				!attr || attr.trimStart() !== attr ? attr : ` ${attr}`,
				'ext-attrs',
				lcName,
				config,
				accum,
			),
			newConfig: Config = {...config, ext: del(config.ext, lcName), excludes: [...config.excludes ?? []]};
		let innerToken: Token;
		switch (lcName) {
			case 'tab':
				newConfig.ext = del(newConfig.ext, 'tabs');
				// fall through
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'option':
			case 'combooption':
			case 'tabs':
			case 'poll':
			case 'seo':
				if (lcName === 'poem') {
					newConfig.excludes!.push('heading');
				}
				innerToken = new Token(inner, newConfig, accum);
				break;
			case 'pre':
				// @ts-expect-error abstract class
				innerToken = new PreToken(inner, newConfig, accum);
				break;
			case 'dynamicpagelist':
				// @ts-expect-error abstract class
				innerToken = new ParamTagToken(inner, newConfig, accum);
				break;
			case 'inputbox':
				newConfig.excludes!.push('heading');
				// @ts-expect-error abstract class
				innerToken = new InputboxToken(inner, newConfig, accum);
				break;
			case 'references': {
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<!--.*?(?:-->|$)|<(ref)(\s[^>]*?)?(?:\/>|>(.*?)<\/(ref\s*)>)/gisu,
					['ref'],
					newConfig,
					accum,
				);
				break;
			}
			case 'choose': {
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(option|choicetemplate)(\s[^>]*?)?(?:\/>|>(.*?)<\/(\1)>)/gsu,
					['option', 'choicetemplate'],
					newConfig,
					accum,
				);
				break;
			}
			case 'combobox': {
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(combooption)(\s[^>]*?)?(?:\/>|>(.*?)<\/(combooption\s*)>)/gisu,
					['combooption'],
					newConfig,
					accum,
				);
				break;
			}
			case 'gallery':
				// @ts-expect-error abstract class
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			case 'imagemap':
				// @ts-expect-error abstract class
				innerToken = new ImagemapToken(inner, newConfig, accum);
				break;
			// 更多定制扩展的代码示例：
			// ```
			// case 'extensionName': {
			//   const {ExtensionToken}: typeof import('../extension') = require('../extension');
			//   innerToken = new ExtensionToken(inner, newConfig, accum);
			//   break;
			// }
			// ```
			default:
				// @ts-expect-error abstract class
				innerToken = new NowikiToken(inner, newConfig, accum);
		}
		innerToken.setAttribute('name', lcName);
		if (innerToken.type === 'plain') {
			innerToken.type = 'ext-inner';
		}
		super(name, attrToken, innerToken, closed, config, accum);
		this.seal('closed', true);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			rect = new BoundingRect(this, start);
		if (this.name !== 'nowiki' && this.closest('html-attrs,table-attrs')) {
			errors.push(generateForSelf(this, rect, 'parsing-order', 'extension tag in HTML tag attributes'));
		}
		if (this.name === 'ref' && this.closest('heading-title')) {
			errors.push(generateForSelf(this, rect, 'var-anchor', 'variable anchor in a section header'));
		}
		return errors;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const inner = this.lastChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			attr = this.firstChild.toString();
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config) as this;
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @private */
	override toHtmlInternal(_?: boolean, nocc?: boolean): string {
		const {name, firstChild, lastChild} = this;
		switch (name) {
			case 'nowiki':
				return font(this, newline(lastChild.toHtmlInternal()));
			case 'pre':
				return font(this, `<pre${firstChild.toHtmlInternal()}>${
					newline(lastChild.toHtmlInternal(false, nocc))
				}</pre>`);
			case 'poem':
				firstChild.classList.add('poem');
				return font(
					this,
					`<div${firstChild.toHtmlInternal()}>${
						lastChild.toHtmlInternal(false, nocc).replace(/(?<!^|<hr>)\n(?!$)/gu, '<br>\n')
							.replace(/^ +/gmu, p => '&nbsp;'.repeat(p.length))
					}</div>`,
				);
			default:
				return '';
		}
	}
}

classes['ExtToken'] = __filename;
