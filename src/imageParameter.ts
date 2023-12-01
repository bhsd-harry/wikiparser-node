import {text, print, extUrlChar, extUrlCharFirst} from '../util/string';
import {generateForSelf} from '../util/lint';
import {Shadow} from '../util/debug';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError, Config} from '../index';
import type {Title} from '../lib/title';
import type {AstNodes, AstText, AtomToken, FileToken} from '../internal';

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 检查图片参数是否合法
 * @param key 参数名
 * @param val 参数值
 */
function validate(key: 'link', val: string, config?: Config, halfParsed?: boolean): string | Title;
/** @ignore */
function validate(key: string, val: string, config?: Config, halfParsed?: boolean): boolean;
/** @ignore */
function validate(key: string, val: string, config = Parser.getConfig(), halfParsed = false): string | Title | boolean {
	val = val.trim();
	let value = val.replace(/\0\d+t\x7F/gu, '').trim();
	switch (key) {
		case 'width':
			return !value || /^(?:\d+x?|\d*x\d+)$/u.test(value);
		case 'link': {
			if (!value) {
				return val;
			}
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
			return !value || config.variants.includes(value);
		case 'alt':
		case 'class':
		case 'manualthumb':
			return true;
		default:
			// @ts-expect-error isNaN
			return !isNaN(value);
	}
}

/** 图片参数 */
export class ImageParameterToken extends Token {
	override readonly type = 'image-parameter';
	declare name: string;
	#syntax = '';

	// @ts-expect-error abstract method
	abstract override get parentNode(): FileToken | undefined;
	// @ts-expect-error abstract method
	abstract override get parentElement(): FileToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get nextElementSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | this;
	// @ts-expect-error abstract method
	abstract override get previousElementSibling(): AtomToken | this;

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
			str.splitText(str.data.indexOf('x'));
			(str.nextSibling as AstText).splitText(1);
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
	constructor(str: string, config = Parser.getConfig(), accum: Token[] = []) {
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
					&& (mt.length !== 4 || validate(key, mt[2], config, true) as string | Title | boolean !== false);
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
	}

	/** @private */
	override afterBuild(): void {
		if (this.parentNode?.type === 'gallery-image' && !galleryParams.has(this.name)) {
			this.setAttribute('name', 'invalid');
		}
	}

	/** @private */
	protected override isPlain(): boolean {
		return this.name === 'caption';
	}

	/** @private */
	override toString(omit?: Set<string>): string {
		return this.#syntax && !(omit && this.matchesTypes(omit))
			? this.#syntax.replace('$1', super.toString(omit))
			: super.toString(omit);
	}

	/** @override */
	override text(): string {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'padding') {
			return Math.max(0, this.#syntax.indexOf('$1')) as TokenAttributeGetter<T>;
		}
		return key === 'syntax' ? this.#syntax as TokenAttributeGetter<T> : super.getAttribute(key);
	}

	/** @override */
	override lint(start = this.getAbsoluteIndex()): LintError[] {
		const errors = super.lint(start),
			{link, name} = this;
		if (name === 'invalid') {
			errors.push(generateForSelf(this, {start}, 'invalid gallery image parameter'));
		} else if (typeof link === 'object' && link.encoded) {
			errors.push(generateForSelf(this, {start}, 'unnecessary URL encoding in an internal link'));
		}
		return errors;
	}

	/** @override */
	override print(): string {
		return this.#syntax
			? `<span class="wpb-image-parameter">${
				this.#syntax.replace('$1', `<span class="wpb-image-caption">${print(this.childNodes)}</span>`)
			}</span>`
			: super.print({class: 'image-caption'});
	}

	/* NOT FOR BROWSER */

	/** @override */
	override cloneNode(): this {
		const cloned = this.cloneChildNodes(),
			config = this.getAttribute('config');
		return Shadow.run(() => {
			const token = new ImageParameterToken(this.#syntax.replace('$1', ''), config) as this;
			token.replaceChildren(...cloned);
			token.setAttribute('name', this.name);
			token.setAttribute('syntax', this.#syntax);
			return token;
		});
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttributeGetter<T>): void {
		if (key === 'syntax') {
			this.#syntax = value;
		} else {
			super.setAttribute(key, value);
		}
	}

	/** 是否是不可变参数 */
	#isVoid(): string | boolean {
		return this.#syntax && !this.#syntax.includes('$1');
	}

	/**
	 * @override
	 * @param token 待插入的子节点
	 * @param i 插入位置
	 * @throws `Error` 不接受自定义输入的图片参数
	 */
	override insertAt(token: string, i?: number): AstText;
	/** @ignore */
	override insertAt<T extends AstNodes>(token: T, i?: number): T;
	/** @ignore */
	override insertAt<T extends AstNodes>(token: string | T, i = this.length): AstText | T {
		if (!Shadow.running && this.#isVoid()) {
			throw new Error(`图片参数 ${this.name} 不接受自定义输入！`);
		}
		return super.insertAt(token as T, i);
	}

	/** 获取参数值 */
	getValue(): string | true {
		return this.name === 'invalid' ? this.text() : this.#isVoid() || super.text();
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

Shadow.classes['ImageParameterToken'] = __filename;
