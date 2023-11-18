import {generateForSelf} from '../../util/lint';
import {attributesParent} from '../../mixin/attributesParent';
import Parser from '../../index';
import {Token} from '..';
import {TagPairToken} from '.';
import {AttributesToken} from '../attributes';
import type {LintError, Config} from '../../index';

/**
 * 从数组中删除指定元素
 * @param arr 数组
 * @param ele 元素
 */
const del = <T>(arr: T[], ele: T): T[] => {
	const set = new Set(arr);
	set.delete(ele);
	return [...set];
};

/**
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, Token]}`
 */
export abstract class ExtToken extends attributesParent(TagPairToken) {
	override readonly type = 'ext';
	declare childNodes: [AttributesToken, Token];
	abstract override get children(): [AttributesToken, Token];
	abstract override get firstChild(): AttributesToken;
	abstract override get firstElementChild(): AttributesToken;
	abstract override get lastChild(): Token;

	/** @override */
	// eslint-disable-next-line class-methods-use-this
	override get closed(): boolean {
		return true;
	}

	/**
	 * @browser
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
				innerToken = new Token(inner, newConfig, true, accum);
				break;
			case 'pre': {
				const {PreToken}: typeof import('../pre') = require('../pre');
				// @ts-expect-error abstract class
				innerToken = new PreToken(inner, newConfig, accum);
				break;
			}
			case 'dynamicpagelist': {
				const {ParamTagToken}: typeof import('../paramTag') = require('../paramTag');
				// @ts-expect-error abstract class
				innerToken = new ParamTagToken(inner, newConfig, accum);
				break;
			}
			case 'inputbox': {
				newConfig.excludes!.push('heading');
				const {InputboxToken}: typeof import('../paramTag/inputbox') = require('../paramTag/inputbox');
				// @ts-expect-error abstract class
				innerToken = new InputboxToken(inner, newConfig, accum);
				break;
			}
			case 'references': {
				const {NestedToken}: typeof import('../nested') = require('../nested');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(
					inner,
					/<!--.*?(?:-->|$)|<(ref)(\s[^>]*)?>(.*?)<\/(ref\s*)>/gisu,
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
					/<(option|choicetemplate)(\s[^>]*)?>(.*?)<\/(\1)>/gsu,
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
					/<(combooption)(\s[^>]*)?>(.*?)<\/(combooption\s*)>/gisu,
					['combooption'],
					newConfig,
					accum,
				);
				break;
			}
			case 'gallery': {
				const {GalleryToken}: typeof import('../gallery') = require('../gallery');
				// @ts-expect-error abstract class
				innerToken = new GalleryToken(inner, newConfig, accum);
				break;
			}
			case 'imagemap': {
				const {ImagemapToken}: typeof import('../imagemap') = require('../imagemap');
				// @ts-expect-error abstract class
				innerToken = new ImagemapToken(inner, newConfig, accum);
				break;
			}
			// 更多定制扩展的代码示例：
			// ```
			// case 'extensionName': {
			//	const {ExtensionToken}: typeof import('../extension') = require('../extension');
			//	innerToken = new ExtensionToken(inner, newConfig, accum);
			//	break;
			// }
			// ```
			default: {
				const {NowikiToken}: typeof import('../nowiki') = require('../nowiki');
				// @ts-expect-error abstract class
				innerToken = new NowikiToken(inner, newConfig);
			}
		}
		innerToken.setAttribute('name', lcName).type = 'ext-inner';
		super(name, attrToken, innerToken, closed, config, accum);
	}

	/**
	 * @override
	 * @browser
	 */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start);
		if (this.name !== 'nowiki' && this.closest('html-attrs, table-attrs')) {
			const root = this.getRootNode(),
				excerpt = String(root).slice(Math.max(0, start - 25), start + 25),
				rect: BoundingRect = {start, ...root.posFromIndex(start)};
			errors.push({...generateForSelf(this, rect, 'extension tag in HTML tag attributes'), excerpt});
		}
		return errors;
	}

	/** @override */
	override cloneNode(): this {
		const inner = this.lastChild.cloneNode(),
			tags = this.getAttribute('tags'),
			config = this.getAttribute('config'),
			attr = String(this.firstChild);
		return Parser.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ExtToken(tags[0], attr, '', this.selfClosing ? undefined : tags[1], config);
			token.lastChild.safeReplaceWith(inner);
			return token;
		});
	}
}

Parser.classes['ExtToken'] = __filename;
