import {
	text,
} from '../util/string';
import {
	MAX_STAGE,
	BuildMethod,
} from '../util/constants';
import {
	setChildNodes,
} from '../util/debug';
import Parser from '../index';
import {AstElement} from '../lib/element';
import {AstText} from '../lib/text';
import type {
	TokenTypes,
} from '../base';
import type {Title, TitleOptions} from '../lib/title';
import type * as CommentAndExtParser from '../parser/commentAndExt';
import type * as BracesParser from '../parser/braces';
import type {
	AstNodes,
} from '../internal';

/**
 * base class for all tokens
 *
 * 所有节点的基类
 */
export class Token extends AstElement {
	#type: TokenTypes = 'plain';

	/** 解析阶段，参见顶部注释。只对plain Token有意义。 */
	#stage = 0;
	readonly #config;

	/** 这个数组起两个作用：1. 数组中的Token会在build时替换`/\0\d+.\x7F/`标记；2. 数组中的Token会依次执行parseOnce和build方法。 */
	readonly #accum;
	#include?: boolean;

	override get type(): TokenTypes {
		return this.#type;
	}

	override set type(value) {
		this.#type = value;
	}

	/** @class */
	constructor(
		wikitext?: string,
		config = Parser.getConfig(),
		accum: Token[] = [],
		acceptable?: WikiParserAcceptable,
	) {
		super();
		if (typeof wikitext === 'string') {
			this.insertAt(wikitext);
		}
		this.#config = config;
		this.#accum = accum;
		accum.push(this);
	}

	/** @private */
	parseOnce(n = this.#stage, include = false, tidy?: boolean): this {
		if (n < this.#stage || this.length !== 1 || !this.isPlain()) {
			return this;
		}
		/* c8 ignore start */
		// eslint-disable-next-line unicorn/prefer-combined-guards
		if (this.#stage >= MAX_STAGE) {
			return this;
		}
		/* c8 ignore stop */
		switch (n) {
			case 0:
				if (this.type === 'root') {
					this.#accum.pop();
				}
				this.#include = include;
				this.#parseCommentAndExt(include);
				break;
			case 1:
				this.#parseBraces();
				// no default
		}
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token?.parseOnce(n, include, tidy); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			}
		}
		this.#stage++;
		return this;
	}

	/** @private */
	buildFromStr(str: string, type: BuildMethod): string;
	/** @private */
	buildFromStr(str: string): AstNodes[];
	/** @private */
	buildFromStr(str: string, type?: BuildMethod): string | readonly AstNodes[] {
		const nodes = str.split(/[\0\x7F]/u).map((s, i) => {
			if (i % 2 === 0) {
				return s && new AstText(s);
			}
			const n = Number(s.slice(0, -1));
			if (
				isNaN(s.slice(-1) as unknown as number)
				&& Number.isSafeInteger(n) && n >= 0 && n < this.#accum.length
			) {
				return this.#accum[n]!;
			}
			/* c8 ignore next */
			throw new Error(`Failed to build! Unrecognized token: ${s}`);
		}).filter(node => node !== '');
		if (type === BuildMethod.String) {
			return nodes.map(String).join('');
		} else if (type === BuildMethod.Text) {
			return text(nodes);
		}
		return nodes;
	}

	/** @private */
	build(): void {
		this.#stage = MAX_STAGE;
		const {length, firstChild} = this,
			str = firstChild?.toString();
		if (length === 1 && firstChild!.type === 'text' && str!.includes('\0')) {
			setChildNodes(this, 0, 1, this.buildFromStr(str!));
			if (this.type === 'root') {
				for (const token of this.#accum) {
					token?.build(); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
				}
			}
		}
	}

	/** @private */
	afterBuild(): void {
		if (this.type === 'root') {
			for (const token of this.#accum) {
				token?.afterBuild(); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			}
		}
	}

	/** @private */
	parse(n = MAX_STAGE, include?: boolean, tidy?: boolean): this {
		n = Math.min(n, MAX_STAGE);
		while (this.#stage < n) {
			this.parseOnce(this.#stage, include, tidy);
		}
		if (n) {
			this.build();
			this.afterBuild();
		}
		return this;
	}

	/**
	 * 解析HTML注释和扩展标签
	 * @param includeOnly 是否嵌入
	 */
	#parseCommentAndExt(includeOnly: boolean): void {
		const {parseCommentAndExt}: typeof CommentAndExtParser = require('../parser/commentAndExt');
		this.setText(parseCommentAndExt(this.firstChild!.toString(), this.#config, this.#accum, includeOnly));
	}

	/** 解析花括号 */
	#parseBraces(): void {
		const {parseBraces}: typeof BracesParser = require('../parser/braces');
		const str = this.type === 'root' ? this.firstChild!.toString() : `\0${this.firstChild!.toString()}`,
			parsed = parseBraces(str, this.#config, this.#accum);
		this.setText(this.type === 'root' ? parsed : parsed.slice(1));
	}

	/** @private */
	isPlain(): boolean {
		return this.constructor === Token;
	}

	/** @private */
	override getAttribute<T extends string>(key: T): TokenAttribute<T> {
		switch (key) {
			case 'config':
				return this.#config as TokenAttribute<T>;
			default:
				return super.getAttribute(key);
		}
	}

	/** @private */
	override setAttribute<T extends string>(key: T, value: TokenAttribute<T>): void {
		switch (key) {
			case 'stage':
				if (this.#stage === 0 && this.type === 'root') {
					this.#accum.shift();
				}
				this.#stage = value as TokenAttribute<'stage'>;
				break;
			default:
				super.setAttribute(key, value);
		}
	}

	/**
	 * @override
	 * @param child node to be inserted / 待插入的子节点
	 * @param i position to be inserted at / 插入位置
	 */
	override insertAt(child: string, i?: number): AstText;
	override insertAt<T extends AstNodes>(child: T, i?: number): T;
	override insertAt<T extends AstNodes>(child: T | string, i = this.length): T | AstText {
		const token = typeof child === 'string' ? new AstText(child) : child,
			{length} = this;
		i += i < 0 ? length : 0;
		super.insertAt(token, i);
		const {
			type,
		} = token;
		if (type === 'root') {
			token.type = 'plain';
		}
		return token;
	}

	// eslint-disable-next-line jsdoc/require-param
	/**
	 * Normalize page title
	 *
	 * 规范化页面标题
	 * @param title title (with or without the namespace prefix) / 标题（含或不含命名空间前缀）
	 * @param defaultNs default namespace number / 命名空间
	 */
	normalizeTitle(title: string, defaultNs = 0, opt?: TitleOptions): Title {
		return Parser.normalizeTitle(
			title,
			defaultNs,
			this.#include,
			this.#config,
			opt,
		);
	}
}
