import {generateForSelf} from '../../util/lint';
import {BoundingRect} from '../../lib/rect';
import Parser from '../../index';
import {attributesParent} from '../../mixin/attributesParent';
import {Token} from '../index';
import {TagPairToken} from './index';
import {AttributesToken} from '../attributes';
import type {LintError, Config} from '../../base';
import type {AttributesParentBase} from '../../mixin/attributesParent';

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
				const {ParamTagToken}: typeof import('../paramTag/index') = require('../paramTag/index');
				// @ts-expect-error abstract class
				innerToken = new ParamTagToken(include, inner, newConfig, accum);
				break;
			}
			case 'inputbox': {
				const {InputboxToken}: typeof import('../paramTag/inputbox') = require('../paramTag/inputbox');
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
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				rect = new BoundingRect(this, start);
			if (this.name !== 'nowiki') {
				const s = this.inHtmlAttrs(),
					rule = 'parsing-order',
					severity = s && Parser.lintConfig.getSeverity(rule, s === 2 ? 'ext' : 'templateInTable');
				if (severity) {
					errors.push(generateForSelf(this, rect, rule, 'ext-in-html', severity));
				}
			}
			const rule = 'var-anchor',
				s = Parser.lintConfig.getSeverity(rule, 'ref');
			if (s && this.name === 'ref' && this.closest('heading-title')) {
				errors.push(generateForSelf(this, rect, rule, 'variable-anchor', s));
			}
			return errors;
		}
	}
}
