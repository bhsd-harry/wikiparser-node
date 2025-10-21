import {getRegex} from '@bhsd/common';
import {
	extUrlChar,
	extUrlCharFirst,
	removeComment,
} from '../util/string';
import {generateForSelf, fixByRemove, fixByDecode} from '../util/lint';
import {
	MAX_STAGE,
} from '../util/constants';
import {Shadow} from '../util/debug';
import Parser from '../index';
import {Token} from './index';
import type {LintError, Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AtomToken,
	FileToken,
	GalleryImageToken,
} from '../internal';

const getUrlLikeRegex = getRegex(protocol => new RegExp(String.raw`^(?:${protocol}|//|\0\d+m\x7F)`, 'iu'));
const getUrlRegex = getRegex(
	protocol => new RegExp(String.raw`^(?:(?:${protocol}|//)${extUrlCharFirst}|\0\d+m\x7F)${extUrlChar}$`, 'iu'),
);
const getSyntaxRegex = getRegex(syntax => new RegExp(
	String.raw`^(\s*(?!\s))${syntax.replace('$1', '(.*)')}${
		syntax.endsWith('$1') ? '(?=$|\n)' : ''
	}(\s*)$`,
	'u',
));

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 获取网址
 * @param link 外链
 */
const getUrl = (link: string): string => {
	if (!link) {
		return link;
	} else if (link.startsWith('//')) {
		link = `https:${link}`;
	}
	return new URL(link).href;
};

/* eslint-disable jsdoc/check-param-names */
/**
 * 检查图片参数是否合法
 * @param key 参数名
 * @param val 参数值
 * @param config
 * @param halfParsed
 * @param ext 文件扩展名
 */
function validate(key: 'link', val: string, config: Config, halfParsed?: boolean): string | Title;
function validate(key: string, val: string, config: Config, halfParsed: boolean, ext: string | undefined): boolean;
function validate(
	key: string,
	val: string,
	config: Config,
	halfParsed?: boolean,
	ext?: string,
): string | Title | boolean {
	val = removeComment(val).trim();
	let value = val.replace(key === 'link' ? /\0\d+[tq]\x7F/gu : /\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return !value && Boolean(val) || /^(?:\d+x?|\d*x\d+)(?:\s*px)?$/u.test(value);
		case 'link': {
			if (!value) {
				return val;
			} else if (getUrlLikeRegex(config.protocol).test(value)) {
				return getUrlRegex(config.protocol).test(value) && val;
			} else if (value.startsWith('[[') && value.endsWith(']]')) {
				value = value.slice(2, -2);
			}
			const title = Parser.normalizeTitle(
				value,
				0,
				false,
				config,
				{halfParsed, decode: true, selfLink: true, page: ''},
			);
			return title.valid && title;
		}
		case 'lang':
			return (ext === 'svg' || ext === 'svgz') && !/[^a-z\d-]/u.test(value);
		case 'alt':
		case 'class':
		case 'manualthumb':
			return true;
		case 'page':
			return (ext === 'djvu' || ext === 'djv' || ext === 'pdf') && Number(value) > 0;
		default:
			return Boolean(value) && !isNaN(value as unknown as number);
	}
}
/* eslint-enable jsdoc/check-param-names */

/**
 * image parameter
 *
 * 图片参数
 */
export abstract class ImageParameterToken extends Token {
	declare readonly name: string;
	readonly #syntax: string = '';

	abstract override get parentNode(): FileToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	override get type(): 'image-parameter' {
		return 'image-parameter';
	}

	/** image link / 图片链接 */
	get link(): string | Title | undefined {
		LINT: { // eslint-disable-line no-unused-labels
			if (this.name !== 'link') {
				return undefined;
			}
			const value = super.text().trim();
			return Shadow.run((): string | Title => {
				const token = new Token(value, this.getAttribute('config'));
				token.parseOnce(0, this.getAttribute('include')).parseOnce();
				return /^\0\d+m\x7F/u.test(token.toString())
					? value
					: validate('link', value, this.getAttribute('config'));
			});
		}
	}

	/** @param str 图片参数 */
	constructor(str: string, extension: string | undefined, config: Config, accum?: Token[]) {
		let mt: [string, string, string, string?] | null;
		const regexes = Object.entries(config.img)
				.map(([syntax, param]) => [syntax, param, getSyntaxRegex(syntax)] as const),
			param = regexes.find(([, key, regex]) => {
				mt = regex.exec(str) as [string, string, string, string?] | null;
				return mt
					&& (
						mt.length !== 4
						|| validate(
							key,
							mt[2],
							config,
							true,
							extension,
						) as string | Title | boolean !== false
					);
			});
		// @ts-expect-error mt already assigned
		if (param && mt) {
			if (mt.length === 3) {
				super(undefined, config, accum);
				this.#syntax = str;
			} else {
				super(mt[2], config, accum, {
				});
				this.#syntax = mt[1] + param[0] + mt[3]!;
			}
			this.setAttribute('name', param[1]);
			if (param[1] === 'alt') {
				this.setAttribute('stage', MAX_STAGE - 1);
			}
			return;
		}
		super(
			str,
			config.excludes.includes('list')
				? config
				: {
					...config,
					excludes: [...config.excludes, 'list'],
				},
			accum,
		);
		this.setAttribute('name', 'caption');
		this.setAttribute('stage', 7);
	}

	/** @private */
	override afterBuild(): void {
		if (this.parentNode?.is<GalleryImageToken>('gallery-image') && !galleryParams.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		return this.#syntax ? this.#syntax.replace('$1', super.toString(skip)) : super.toString(skip);
	}

	/** @private */
	override text(): string {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @private */
	override isPlain(): boolean {
		return this.name === 'caption' || this.name === 'alt';
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		return key === 'padding'
			? Math.max(0, this.#syntax.indexOf('$1')) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		LINT: { // eslint-disable-line no-unused-labels
			const errors = super.lint(start, re),
				{lintConfig} = Parser,
				{computeEditInfo, fix} = lintConfig,
				{link, name} = this,
				value = name === 'width' && this.getValue() as string | false;
			if (name === 'invalid' || value && value.endsWith('px')) {
				const rule = 'invalid-gallery',
					s = lintConfig.getSeverity(rule, 'parameter');
				if (s) {
					const e = generateForSelf(this, {start}, rule, 'invalid-image-parameter', s);
					if (computeEditInfo || fix) {
						e.fix = value ? fixByRemove(e, 0, value) : fixByRemove(e, -1);
					}
					errors.push(e);
				}
			} else if (name === 'link') {
				if (typeof link === 'string') {
					const rule = 'invalid-url',
						s = lintConfig.getSeverity(rule);
					if (s && !this.querySelector('magic-word')) {
						try {
							getUrl(link);
						} catch {
							errors.push(generateForSelf(this, {start}, rule, 'invalid-url', s));
						}
					}
				} else if (link!.encoded) {
					const rule = 'url-encoding',
						s = lintConfig.getSeverity(rule, 'file');
					if (s) {
						const e = generateForSelf(this, {start}, rule, 'unnecessary-encoding', s);
						if (computeEditInfo || fix) {
							e.fix = fixByDecode(e, this);
						}
						errors.push(e);
					}
				}
			}
			return errors;
		}
	}

	/** 是否是不可变参数 */
	#isVoid(): string | boolean {
		LINT: return this.#syntax && !this.#syntax.includes('$1'); // eslint-disable-line no-unused-labels
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string | true {
		// eslint-disable-next-line no-unused-labels
		LINT: return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
	}
}
