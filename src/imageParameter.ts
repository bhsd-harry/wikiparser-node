import {
	extUrlChar,
	extUrlCharFirst,
	print,

	/* NOT FOR BROWSER */

	text,
} from '../util/string';
import {generateForSelf} from '../util/lint';
import {Shadow} from '../util/debug';
import {classes} from '../util/constants';
import Parser from '../index';
import {Token} from './index';
import type {LintError, Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AtomToken,
	FileToken,

	/* NOT FOR BROWSER */

	AstNodes,
	AstText,
} from '../internal';

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 检查图片参数是否合法
 * @param key 参数名
 * @param val 参数值
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
	val = val.trim();
	let value = val.replace(/\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return !value || /^(?:\d+x?|\d*x\d+)(?:\s*px)?$/u.test(value);
		case 'link': {
			if (!value) {
				return val;
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			/^(?:\/\/(?:\[[\da-f:.]+\]|[^[\]<>"\t\n\p{Zs}])|\0\d+m\x7F)(?:[^[\]<>"\0\t\n\p{Zs}]|\0\d+c\x7F)*$/iu;
			const regex = new RegExp(
				`^(?:(?:${config.protocol}|//)${extUrlCharFirst}|\0\\d+m\x7F)${extUrlChar}$`,
				'iu',
			);
			if (regex.test(value)) {
				return val;
			} else if (value.startsWith('[[') && value.endsWith(']]')) {
				value = value.slice(2, -2);
			}
			const title = Parser.normalizeTitle(value, 0, false, config, halfParsed, true, true);
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

/** 图片参数 */
export abstract class ImageParameterToken extends Token {
	override readonly type = 'image-parameter';
	declare readonly name: string;
	#syntax = '';
	#extension;

	abstract override get parentNode(): FileToken | undefined;
	abstract override get nextSibling(): this | undefined;
	abstract override get previousSibling(): AtomToken | this;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): FileToken | undefined;
	abstract override get nextElementSibling(): this | undefined;
	abstract override get previousElementSibling(): AtomToken | this;

	/* NOT FOR BROWSER END */

	/** 图片链接 */
	get link(): string | Title | undefined {
		return this.name === 'link' ? validate('link', super.text(), this.getAttribute('config')) : undefined;
	}

	/* NOT FOR BROWSER */

	set link(value: string) {
		if (this.name === 'link') {
			this.setValue(value);
		}
	}

	/** getValue()的getter */
	get value(): string | true {
		return this.getValue();
	}

	set value(value) {
		this.setValue(value);
	}

	/** 图片大小 */
	get size(): {width: string, height: string} | undefined {
		if (this.name === 'width') {
			const size = (this.getValue() as string).trim();
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
			this.setValue(size && `${size.width}${size.height && 'x'}${size.height}`);
		}
	}

	/** 图片宽度 */
	get width(): string | undefined {
		return this.size?.width;
	}

	set width(width) {
		if (this.name === 'width') {
			const {height} = this;
			this.setValue(`${width || ''}${height! && 'x'}${height!}`);
		}
	}

	/** 图片高度 */
	get height(): string | undefined {
		return this.size?.height;
	}

	set height(height) {
		if (this.name === 'width') {
			this.setValue(`${this.width!}${height ? `x${height}` : ''}`);
		}
	}

	/* NOT FOR BROWSER END */

	/** @param str 图片参数 */
	constructor(str: string, extension: string | undefined, config = Parser.getConfig(), accum: Token[] = []) {
		let mt: [string, string, string, string?] | null;
		const regexes = Object.entries(config.img).map(
				([syntax, param]): [string, string, RegExp] => [
					syntax,
					param,
					new RegExp(`^(\\s*)${syntax.replace('$1', '(.*)')}(\\s*)$`, 'u'),
				],
			),
			param = regexes.find(([, key, regex]) => {
				mt = regex.exec(str) as [string, string, string, string?] | null;
				return mt
					&& (
						mt.length !== 4
						|| validate(key, mt[2], config, true, extension) as string | Title | boolean !== false
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
				this.#syntax = `${mt[1]}${param[0]}${mt[3]!}`;
			}
			this.setAttribute('name', param[1]);
			return;
		}
		super(str, {...config, excludes: [...config.excludes ?? [], 'list']}, accum);
		this.setAttribute('name', 'caption');
		this.setAttribute('stage', 7);

		/* NOT FOR BROWSER */

		this.#extension = extension;
	}

	/** @private */
	override afterBuild(): void {
		if (this.parentNode?.type === 'gallery-image' && !galleryParams.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
	}

	/** @private */
	override toString(): string {
		return this.#syntax ? this.#syntax.replace('$1', super.toString()) : super.toString();
	}

	/** @override */
	override text(): string {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'plain') {
			return (this.name === 'caption') as TokenAttributeGetter<T>;

			/* NOT FOR BROWSER */
		} else if (key === 'syntax') {
			return this.#syntax as TokenAttributeGetter<T>;

			/* NOT FOR BROWSER END */
		}
		return key === 'padding'
			? Math.max(0, this.#syntax.indexOf('$1')) as TokenAttributeGetter<T>
			: super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{link, name} = this;
		if (name === 'invalid') {
			const e = generateForSelf(this, {start}, 'invalid-gallery', 'invalid gallery image parameter');
			e.fix = {
				range: [start, start + e.endIndex],
				text: '',
			};
			errors.push(e);
		} else if (typeof link === 'object' && link.encoded) {
			errors.push(generateForSelf(this, {start}, 'url-encoding', 'unnecessary URL encoding in an internal link'));
		}
		return errors;
	}

	/** 是否是不可变参数 */
	#isVoid(): string | boolean {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/** 获取参数值 */
	getValue(): string | true {
		return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
	}

	/** @override */
	override print(): string {
		if (this.#syntax) {
			return `<span class="wpb-image-parameter">${
				this.#syntax.replace('$1', `<span class="wpb-image-caption">${print(this.childNodes)}</span>`)
			}</span>`;
		}
		return super.print({class: 'image-caption'});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			// @ts-expect-error abstract class
			const token = new ImageParameterToken(this.#syntax.replace('$1', ''), this.#extension, config) as this;
			token.replaceChildren(...cloned);
			token.setAttribute('name', this.name);
			token.setAttribute('syntax', this.#syntax);
			return token;
		});
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttributeGetter<T>): void {
		if (key === 'syntax') {
			this.#syntax = value as string;
		} else {
			super.setAttribute(key, value);
		}
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `Error` 不接受自定义输入的图片参数
	 */
	override insertAt(token: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	override insertAt<T extends AstNodes>(token: T | string, i?: number): T | AstText {
		if (!Shadow.running && this.#isVoid()) {
			throw new Error(`图片参数 ${this.name} 不接受自定义输入！`);
		}
		return super.insertAt(token as T, i);
	}

	/**
	 * 设置参数值
	 * @param value 参数值
	 * @throws `Error` 无效参数
	 */
	setValue(value: string | boolean = false): void {
		const {name} = this;
		if (value === false) {
			this.remove();
			return;
		} else if (name === 'invalid') {
			throw new Error('当前节点是一个无效的图片参数！');
		}
		const type = this.#isVoid() ? 'Boolean' : 'String';
		if (typeof value !== type.toLowerCase()) { // eslint-disable-line valid-typeof
			this.typeError('setValue', type);
		} else if (value !== true) {
			const include = this.getAttribute('include'),
				config = this.getAttribute('config'),
				{childNodes} = Parser.parse(value, include, name === 'caption' ? undefined : 5, config);
			this.replaceChildren(...childNodes);
		}
	}
}

classes['ImageParameterToken'] = __filename;
