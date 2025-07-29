import Parser from '../../index';
import {Token} from '../index';
import {TagPairToken} from './index';
import {AttributesToken} from '../attributes';
import type {Config} from '../../base';

/**
 * extension tag
 *
 * 扩展标签
 * @classdesc `{childNodes: [AttributesToken, Token]}`
 */
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
			};
		let innerToken: Token;
		switch (lcName) {
			case 'indicator':
			case 'poem':
			case 'ref':
			case 'seo':
			case 'langconvert':
			case 'phonos':
				if (lcName === 'poem') {
					newConfig.excludes.push('heading');
				}
				innerToken = new Token(inner, newConfig, accum);
				break;
			case 'references': {
				// NestedToken 依赖 ExtToken
				const {NestedToken}: typeof import('../nested') = require('../nested');
				newConfig.excludes.push('heading');
				// @ts-expect-error abstract class
				innerToken = new NestedToken(inner, include, ['ref'], newConfig, accum);
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
}
