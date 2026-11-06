import Parser from '../../index';
import {attributesParent} from '../../mixin/attributesParent';
import {Token} from '../index';
import {TagPairToken} from './index';
import {AttributesToken} from '../attributes';
import type {
	Config,
} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';
import type * as Nested from '../nested';
import type * as Gallery from '../multiLine/gallery';
import type * as Nowiki from '../nowiki/index';
import type * as Pre from '../pre';
import type * as MultiLine from '../multiLine/index';
import type * as ParamTag from '../multiLine/paramTag';
import type * as Inputbox from '../multiLine/inputbox';
import type * as Imagemap from '../multiLine/imagemap';
import type * as Commented from '../commented';
import type * as Categorytree from '../link/categorytree';
import type * as FuncTag from '../funcTag';
import type * as Charinsert from '../multiLine/charinsert';

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
import {tagHooks} from '../../util/constants';
import {cached} from '../../mixin/cached';
import type * as Extension from '../../render/extension';

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
			case 'pre':
				if (attrToken.getAttr('format') !== 'wikitext') {
					const {PreToken}: typeof Pre = require('../pre');
					// @ts-expect-error abstract class
					innerToken = new PreToken(inner, newConfig, accum);
					break;
				}
				newConfig.excludes.push('list');
				// fall through
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'option':
			case 'combooption':
			case 'tab':
			case 'tabs':
			case 'langconvert':
			case 'phonos':
				switch (lcName) {
					case 'poem':
						newConfig.excludes.push('heading');
						break;
					case 'langconvert':
						newConfig.excludes.push('list');
						break;
					case 'tab':
						newConfig.ext = newConfig.ext.filter(e => e !== 'tabs');
						break;
					case 'ref':
						newConfig.ext = newConfig.ext.filter(e => e !== 'references');
					// no default
				}
				innerToken = new Token(inner, newConfig, accum);
				break;
			case 'poll': {
				const {MultiLineToken}: typeof MultiLine = require('../multiLine/index');
				// @ts-expect-error abstract class
				innerToken = new MultiLineToken(inner, newConfig, accum);
				break;
			}
			case 'dynamicpagelist': {
				const {ParamTagToken}: typeof ParamTag = require('../multiLine/paramTag');
				// @ts-expect-error abstract class
				innerToken = new ParamTagToken(lcName, include, inner, newConfig, accum);
				break;
			}
			case 'inputbox': {
				const {InputboxToken}: typeof Inputbox = require('../multiLine/inputbox');
				// @ts-expect-error abstract class
				innerToken = new InputboxToken(lcName, include, inner, newConfig, accum);
				break;
			}
			case 'references': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof Nested = require('../nested');
				newConfig.excludes.push('heading');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(inner, include, ['ref'], newConfig, accum);
				break;
			}
			case 'choose': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof Nested = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(option|choicetemplate)(?=\s|\/?>)/gu,
					['option', 'choicetemplate'],
					newConfig,
					accum,
				);
				break;
			}
			case 'combobox': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof Nested = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<(combooption)(?=\s|\/?>)/gu,
					['combooption'],
					newConfig,
					accum,
				);
				break;
			}
			case 'gallery': {
				const {GalleryToken}: typeof Gallery = require('../multiLine/gallery');
				// @ts-expect-error abstract class
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'imagemap': {
				const {ImagemapToken}: typeof Imagemap = require('../multiLine/imagemap');
				// @ts-expect-error abstract class
				innerToken = new ImagemapToken(inner, newConfig, accum);
				break;
			}
			case 'hiero': {
				const {CommentedToken}: typeof Commented = require('../commented');
				// @ts-expect-error abstract class
				innerToken = new CommentedToken(inner, newConfig, accum);
				break;
			}
			case 'categorytree': {
				const {CategorytreeToken}: typeof Categorytree = require('../link/categorytree');
				// @ts-expect-error abstract class
				innerToken = new CategorytreeToken(inner, undefined, newConfig, accum);
				break;
			}
			case 'seo': {
				const {FuncTagToken}: typeof FuncTag = require('../funcTag');
				// @ts-expect-error abstract class
				innerToken = new FuncTagToken(inner, newConfig, accum);
				break;
			}
			case 'charinsert': {
				const {CharinsertToken}: typeof Charinsert = require('../multiLine/charinsert');
				// @ts-expect-error abstract class
				innerToken = new CharinsertToken(inner, newConfig, accum);
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
				const {NowikiToken}: typeof Nowiki = require('../nowiki/index');
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
	/** @private */
	lintRef(): string {
		const refName = this.getAttr('name'),
			text = this.innerText?.trim();
		let msg = '';
		if (this.closest('ext-inner#references')) {
			if (!refName) {
				msg = 'no-named-in-references';
			} else if (!text) {
				msg = 'no-empty-in-references';
			}
		} else if (!refName && !text) {
			msg = this.hasAttr('details') ? 'ref-details' : 'ref-no-name';
		}
		return msg;
	}

	/** @private */
	override text(): string {
		const {name, firstChild, lastChild, selfClosing} = this;
		return `<${name}${firstChild.text()}${selfClosing ? '/>' : `>${lastChild.text()}</${name}>`}`;
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const attrs = this.firstChild.cloneNode(),
			inner = this.lastChild.cloneNode(),
			tags = this.getAttribute('tags');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ExtToken(
				tags[0],
				undefined,
				undefined,
				this.selfClosing ? undefined : tags[1],
				this.getAttribute('config'),
				this.getAttribute('include'),
			);
			token.firstChild.safeReplaceWith(attrs);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}

	/** @ignore */
	#toHtmlOrPlain(render: typeof Extension.renderExt, opt?: Omit<HtmlOpt, 'nowrap'>): string {
		const {name} = this;
		return tagHooks.has(name) ? tagHooks.get(name)!(this) : render(this, opt);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		const {renderExt}: typeof Extension = require('../../render/extension');
		return this.#toHtmlOrPlain(renderExt, opt);
	}
}
