import {
	print,
	extUrlChar,
	extUrlCharFirst,
} from '../util/string';
import {generateForSelf} from '../util/lint';
import * as Parser from '../index';
import {Token} from './index';
import type {LintError, Config} from '../base';
import type {Title} from '../lib/title';
import type {
	AtomToken,
	FileToken,
} from '../internal';

export const galleryParams = new Set(['alt', 'link', 'lang', 'page', 'caption']);

/**
 * 检查图片参数是否合法
 * @param key 参数名
 * @param val 参数值
 */
function validate(key: 'link', val: string, config?: Config, halfParsed?: boolean): string | Title;
function validate(key: string, val: string, config?: Config, halfParsed?: boolean): boolean;
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
			return !value || config.variants.includes(value);
		case 'alt':
		case 'class':
		case 'manualthumb':
			return true;
		default:
			return !Number.isNaN(Number(value));
	}
}

/** 图片参数 */
export class ImageParameterToken extends Token {
	override readonly type = 'image-parameter';
	declare readonly name: string;
	#syntax = '';

	// @ts-expect-error abstract method
	abstract override get parentNode(): FileToken | undefined;
	// @ts-expect-error abstract method
	abstract override get nextSibling(): this | undefined;
	// @ts-expect-error abstract method
	abstract override get previousSibling(): AtomToken | this;

	/** 图片链接 */
	get link(): string | Title | undefined {
		return this.name === 'link' ? validate('link', super.text(), this.getAttribute('config')) : undefined;
	}

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
	override toString(omit?: Set<string>): string {
		return this.#syntax
			? this.#syntax.replace('$1', super.toString(omit))
			: super.toString(omit);
	}

	/** @override */
	override text(): string {
		return this.#syntax ? this.#syntax.replace('$1', super.text()).trim() : super.text().trim();
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttributeGetter<T> {
		if (key === 'plain') {
			return (this.name === 'caption') as TokenAttributeGetter<T>;
		}
		return key === 'padding'
			? Math.max(0, this.#syntax.indexOf('$1')) as TokenAttributeGetter<T>
			: super.getAttribute(key);
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
			return this.name === 'invalid'
				? `<span class="wpb-image-invalid">${this.#syntax.replace('$1', print(this.childNodes))}</span>`
				: `<span class="wpb-image-parameter">${
					this.#syntax.replace('$1', `<span class="wpb-image-caption">${print(this.childNodes)}</span>`)
				}</span>`;
		}
		return super.print({class: 'image-caption'});
	}
}
