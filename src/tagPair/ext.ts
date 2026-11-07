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

/* NOT FOR BROWSER */

import {Shadow} from '../../util/debug';
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
			case 'langconvert':
				switch (lcName) {
					case 'poem':
						newConfig.excludes.push('heading');
						break;
					case 'langconvert':
						newConfig.excludes.push('list');
						break;
					case 'ref':
						newConfig.ext = newConfig.ext.filter(e => e !== 'references');
					// no default
				}
				innerToken = new Token(inner, newConfig, accum);
				break;
			case 'references': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof Nested = require('../nested');
				newConfig.excludes.push('heading');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(inner, include, ['ref'], newConfig, accum);
				break;
			}
			case 'gallery': {
				const {GalleryToken}: typeof Gallery = require('../multiLine/gallery');
				// @ts-expect-error abstract class
				innerToken = new GalleryToken(inner, newConfig, accum);
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
		return render(this, opt);
	}

	/** @private */
	@cached()
	override toHtmlInternal(opt?: Omit<HtmlOpt, 'nowrap'>): string {
		const {renderExt}: typeof Extension = require('../../render/extension');
		return this.#toHtmlOrPlain(renderExt, opt);
	}
}
