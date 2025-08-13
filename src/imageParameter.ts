import {getRegex} from '@bhsd/common';
import {
	extUrlChar,
	extUrlCharFirst,
	removeComment,
	print,

	/* NOT FOR BROWSER */

	text,
} from '../util/string';
import {generateForSelf, fixByRemove, fixByDecode} from '../util/lint';
import Parser from '../index';
import {Token} from './index';
import type {LintError, Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AtomToken,
	FileToken,
	GalleryImageToken,

	/* NOT FOR BROWSER */

	AstNodes,
	AstText,
} from '../internal';

/* NOT FOR BROWSER */

import {Shadow} from '../util/debug';
import {classes} from '../util/constants';

/* NOT FOR BROWSER END */

/^(?:ftp:\/\/|\/\/|\0\d+m\x7F)/iu; // eslint-disable-line @typescript-eslint/no-unused-expressions
const getUrlLikeRegex = getRegex(protocol => new RegExp(String.raw`^(?:${protocol}|//|\0\d+m\x7F)`, 'iu'));
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(?:(?:ftp:\/\/|\/\/)(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])|\0\d+m\x7F)[^[\]<>"\0\t\n\p{Zs}]*$/iu;
const getUrlRegex = getRegex(
	protocol => new RegExp(String.raw`^(?:(?:${protocol}|//)${extUrlCharFirst}|\0\d+m\x7F)${extUrlChar}$`, 'iu'),
);
/* eslint-disable @typescript-eslint/no-unused-expressions */
/^(\s*)link=(.*)(?=$|\n)(\s*)$/u;
/^(\s*(?!\s))(.*)px(\s*)$/u;
/* eslint-enable @typescript-eslint/no-unused-expressions */
const getSyntaxRegex = getRegex(syntax => new RegExp(
	String.raw`^(\s*(?!\s))${syntax.replace('$1', '(.*)')}${
		syntax.endsWith('$1') ? '(?=$|\n)' : ''
	}(\s*)$`,
	'u',
));

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

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
				{halfParsed, decode: true, selfLink: true},
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
	readonly #extension;

	abstract override get parentNode(): FileToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this | undefined;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): FileToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): AtomToken | this | undefined;

	/* NOT FOR BROWSER END */

	override get type(): 'image-parameter' {
		return 'image-parameter';
	}

	/** image link / 图片链接 */
	get link(): string | Title | undefined {
		return this.name === 'link' ? validate('link', super.text(), this.getAttribute('config')) : undefined;
	}

	/* NOT FOR BROWSER */

	set link(value: string) {
		if (this.name === 'link') {
			this.setValue(value);
		}
	}

	/** parameter value / 参数值 */
	get value(): string | true {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/** iamge size / 图片大小 */
	get size(): {width: string, height: string} | undefined {
		if (this.name === 'width') {
			const size = (this.getValue() as string).trim().replace(/px$/u, '').trim();
			if (!size.includes('{{')) {
				const [width, height = ''] = size.split('x') as [string, string?];
				return {width, height};
			}
			const token = Parser.parse(size, false, 2, this.getAttribute('config')),
				i = token.childNodes.findIndex(({type, data}) => type === 'text' && data.includes('x'));
			if (i === -1) {
				return {width: size, height: ''};
			}
			const str = token.childNodes[i] as AstText;
			str.splitText(str.data.indexOf('x')).splitText(1);
			return {width: text(token.childNodes.slice(0, i + 1)), height: text(token.childNodes.slice(i + 2))};
		}
		return undefined;
	}

	set size(size) {
		if (this.name === 'width') {
			this.setValue(size && size.width + (size.height && 'x') + size.height);
		}
	}

	/** image width / 图片宽度 */
	get width(): string | undefined {
		return this.size?.width;
	}

	set width(width) {
		if (this.name === 'width') {
			const {height} = this;
			this.setValue((width || '') + (height! && 'x') + height!);
		}
	}

	/** image height / 图片高度 */
	get height(): string | undefined {
		return this.size?.height;
	}

	set height(height) {
		if (this.name === 'width') {
			this.setValue(this.width! + (height ? `x${height}` : ''));
		}
	}

	/* NOT FOR BROWSER END */

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
					'Stage-2': ':', '!HeadingToken': ':',
				});
				this.#syntax = mt[1] + param[0] + mt[3]!;
			}
			this.setAttribute('name', param[1]);
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

		/* NOT FOR BROWSER */

		this.#extension = extension;
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
		return this.name === 'caption';
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		/* PRINT ONLY */

		if (key === 'invalid') {
			return (this.name === 'invalid') as TokenAttribute<T>;
		}

		/** PRINT ONLY END */

		return key === 'padding'
			? Math.max(0, this.#syntax.indexOf('$1')) as TokenAttribute<T>
			: super.getAttribute(key);
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{link, name} = this;
		if (name === 'invalid') {
			const rule = 'invalid-gallery',
				s = Parser.lintConfig.getSeverity(rule, 'parameter');
			if (s) {
				const e = generateForSelf(this, {start}, rule, 'invalid image parameter', s);
				e.fix = fixByRemove(e, -1);
				errors.push(e);
			}
		} else if (typeof link === 'object' && link.encoded) {
			const rule = 'url-encoding',
				s = Parser.lintConfig.getSeverity(rule, 'file');
			if (s) {
				const e = generateForSelf(this, {start}, rule, 'unnecessary URL encoding in an internal link', s);
				e.fix = fixByDecode(e, this);
				errors.push(e);
			}
		}
		return errors;
	}

	/** 是否是不可变参数 */
	#isVoid(): string | boolean {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/**
	 * Get the parameter value
	 *
	 * 获取参数值
	 */
	getValue(): string | true {
		return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
	}

	/** @private */
	override print(): string {
		if (this.#syntax) {
			return `<span class="wpb-image-parameter${this.name === 'invalid' ? ' wpb-invalid' : ''}">${
				this.#syntax.replace(
					'$1',
					`<span class="wpb-image-caption">${print(this.childNodes)}</span>`,
				)
			}</span>`;
		}
		return super.print({class: 'image-caption'});
	}

	/* NOT FOR BROWSER */

	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token: this = new ImageParameterToken(
				this.#syntax.replace('$1', '1'),
				this.#extension,
				config,
			);
			token.safeReplaceChildren(cloned);
			return token;
		});
	}

	/**
	 * @override
	 * @param token node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 * @throws `Error` 不接受自定义输入的图片参数
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		if (!Shadow.running && this.#isVoid()) {
			throw new Error(`Image parameter ${this.name} does not accept custom input!`);
		}
		return super.insertAt(token as T, i);
	}

	/**
	 * Set the parameter value
	 *
	 * 设置参数值
	 * @param value parameter value / 参数值
	 * @throws `Error` 无效参数
	 */
	setValue(value: string | boolean = false): void {
		const {name} = this;
		if (value === false) {
			this.remove();
			return;
		} else if (name === 'invalid') {
			throw new Error('Invalid image parameter!');
		}
		const type = this.#isVoid() ? 'Boolean' : 'String';
		if (typeof value !== type.toLowerCase()) { // eslint-disable-line valid-typeof
			this.typeError('setValue', type);
		} else if (value !== true) {
			const include = this.getAttribute('include'),
				config = this.getAttribute('config'),
				{childNodes} = Parser.parse(value, include, name === 'caption' ? undefined : 5, config);
			this.safeReplaceChildren(childNodes);
		}
	}

	/**
	 * Get the URL
	 *
	 * 获取网址
	 * @param articlePath article path / 条目路径
	 * @since v1.11.0
	 */
	getUrl(articlePath?: string): string | undefined {
		let {link} = this;
		if (!link) {
			return link;
		} else if (typeof link !== 'string') {
			return link.getUrl(articlePath);
		} else if (link.startsWith('//')) {
			link = `https:${link}`;
		}
		return new URL(link).href;
	}
}

classes['ImageParameterToken'] = __filename;
