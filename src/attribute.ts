import {generateForChild, provideValues} from '../util/lint';
import {
	removeComment,
	trimLc,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import {commonHtmlAttrs, extAttrs, htmlAttrs, obsoleteAttrs} from '../util/sharable';
import {BoundingRect} from '../lib/rect';
import Parser from '../index';
import {Token} from './index';
import {AtomToken} from './atom';
import type {
	LintError,
	Config,
} from '../base';
import type {AttributesToken} from '../internal';

declare type Child = AtomToken | AttributeToken | undefined;
export type AttributeTypes = 'ext-attr' | 'html-attr' | 'table-attr';

const insecureStyle =
	/expression|(?:accelerator|-o-link(?:-source)?|-o-replace)\s*:|(?:url|src|image(?:-set)?)\s*\(|attr\s*\([^)]+[\s,]url/u,
	complexTypes = new Set(['ext', 'arg', 'magic-word', 'template']);

/**
 * attribute of extension and HTML tags
 *
 * 扩展和HTML标签属性
 * @classdesc `{childNodes: [AtomToken, Token|AtomToken]}`
 */
export abstract class AttributeToken extends Token {
	declare readonly name: string;
	readonly #type;
	#tag;
	#equal;
	#quotes: [string?, string?];

	declare readonly childNodes: readonly [AtomToken, Token];
	abstract override get firstChild(): AtomToken;
	abstract override get lastChild(): Token;
	abstract override get parentNode(): AttributesToken | undefined;
	abstract override get nextSibling(): Child;
	abstract override get previousSibling(): Child;

	override get type(): AttributeTypes {
		return this.#type;
	}

	/** tag name / 标签名 */
	get tag(): string {
		return this.#tag;
	}

	/** whether the quotes are balanced / 引号是否匹配 */
	get balanced(): boolean {
		return !this.#equal || this.#quotes[0] === this.#quotes[1];
	}

	/**
	 * @param type 标签类型
	 * @param tag 标签名
	 * @param key 属性名
	 * @param equal 等号
	 * @param value 属性值
	 * @param quotes 引号
	 */
	constructor(
		type: AttributeTypes,
		tag: string,
		key: string,
		equal = '',
		value?: string,
		quotes: readonly [string?, string?] = [],
		config = Parser.getConfig(),
		accum: Token[] = [],
	) {
		const keyToken = new AtomToken(
			key,
			'attr-key',
			config,
			accum,
		);
		let valueToken: Token;
		if (key === 'title' || tag === 'img' && key === 'alt') {
			valueToken = new Token(value, config, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', MAX_STAGE - 1);
		} else if (
			tag === 'gallery' && key === 'caption'
			|| tag === 'choose' && (key === 'before' || key === 'after')
		) {
			const newConfig: Config = {
				...config,
				excludes: [...config.excludes, 'heading', 'html', 'table', 'hr', 'list'],
			};
			valueToken = new Token(value, newConfig, accum, {
			});
			valueToken.type = 'attr-value';
			valueToken.setAttribute('stage', 1);
		} else {
			valueToken = new AtomToken(value, 'attr-value', config, accum, {
			});
		}
		super(undefined, config, accum);
		this.#type = type;
		this.append(keyToken, valueToken);
		this.#equal = equal;
		this.#quotes = [...quotes];
		this.#tag = tag;
		this.setAttribute('name', trimLc(removeComment(key)));
	}

	/** @private */
	override afterBuild(): void {
		if (this.#equal.includes('\0')) {
			this.#equal = this.buildFromStr(this.#equal, BuildMethod.String);
		}
		if (this.parentNode) {
			this.#tag = this.parentNode.name;
		}
		this.setAttribute('name', trimLc(this.firstChild.text()));
		super.afterBuild();
	}

	/** @private */
	override toString(skip?: boolean): string {
		const [quoteStart = '', quoteEnd = ''] = this.#quotes;
		return this.#equal ? super.toString(skip, this.#equal + quoteStart) + quoteEnd : this.firstChild.toString(skip);
	}

	/** @private */
	override text(): string {
		return this.#equal ? `${super.text(`${this.#equal.trim()}"`)}"` : this.firstChild.text();
	}

	/** @private */
	override getGaps(): number {
		return this.#equal ? this.#equal.length + (this.#quotes[0]?.length ?? 0) : 0;
	}

	/**
	 * 判定无效的属性名或值
	 * @param start 起始位置
	 * @param rect 位置
	 */
	#lint(start: number, rect?: BoundingRect): LintError | false {
		const {firstChild, lastChild, type, name, tag} = this,
			value = this.getValue(),
			attrs = extAttrs[tag],
			attrs2 = htmlAttrs[tag],
			{length} = this.toString();
		if (
			!attrs?.has(name)
			&& !attrs2?.has(name)
			// 不是未定义的扩展标签或包含嵌入的HTML标签
			&& (type === 'ext-attr' ? attrs || attrs2 : !/\{\{[^{]+\}\}/u.test(name))
			&& (
				type === 'ext-attr' && !attrs2
				|| !/^(?:xmlns:[\w:.-]+|data-(?!ooui|mw|parsoid)[^:]*)$/u.test(name)
				&& (tag === 'meta' || tag === 'link' || !commonHtmlAttrs.has(name))
			)
		) {
			const e = generateForChild(firstChild, rect!, 'illegal-attr', 'illegal attribute name');
			e.suggestions = [{desc: 'remove', range: [start, start + length], text: ''}];
			return e;
		} else if (name === 'style' && typeof value === 'string' && insecureStyle.test(value)) {
			return generateForChild(lastChild, rect!, 'insecure-style', 'insecure style');
		} else if (name === 'tabindex' && typeof value === 'string' && value !== '0') {
			const e = generateForChild(lastChild, rect!, 'illegal-attr', 'nonzero tabindex');
			e.suggestions = [
				{desc: 'remove', range: [start, start + length], text: ''},
				{desc: '0 tabindex', range: [e.startIndex, e.endIndex], text: '0'},
			];
			return e;
		} else if (type !== 'ext-attr' && !lastChild.childNodes.some(({type: t}) => complexTypes.has(t))) {
			const data = provideValues(tag, name),
				v = String(value).toLowerCase();
			if (data.length > 0 && data.every(n => n !== v)) {
				return generateForChild(
					lastChild,
					rect!,
					'illegal-attr',
					'illegal attribute value',
					'warning',
				);
			}
		}
		return false;
	}

	/** @private */
	override lint(start = this.getAbsoluteIndex(), re?: RegExp): LintError[] {
		const errors = super.lint(start, re),
			{balanced, firstChild, lastChild, name, tag} = this,
			rect = new BoundingRect(this, start);
		if (!balanced) {
			const e = generateForChild(
				lastChild,
				rect,
				'unclosed-quote',
				Parser.msg('unclosed $1', 'quotes'),
				'warning',
			);
			e.startIndex--;
			e.startCol--;
			e.suggestions = [{desc: 'close', range: [e.endIndex, e.endIndex], text: this.#quotes[0]!}];
			errors.push(e);
		}
		const e = this.#lint(start, rect);
		if (e) {
			errors.push(e);
		}
		if (obsoleteAttrs[tag]?.has(name)) {
			errors.push(
				generateForChild(
					firstChild,
					rect,
					'obsolete-attr',
					'obsolete attribute',
					'warning',
				),
			);
		}
		return errors;
	}

	/**
	 * Get the attribute value
	 *
	 * 获取属性值
	 */
	getValue(): string | true {
		return this.#equal ? this.lastChild.text().trim() : this.type === 'ext-attr' || '';
	}
}
