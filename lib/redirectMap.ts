import type ParserBase from '../index';

/**
 * 快速规范化页面标题
 * @param title 标题
 */
const normalizeTitle = (title: string): string => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const Parser: typeof ParserBase = require('../index').default;
	return String(Parser.normalizeTitle(
		title,
		0,
		false,
		undefined,
		{temporary: true, page: ''},
	));
};

/** 重定向列表 */
export class RedirectMap extends Map<string, string> {
	#redirect;

	/** @ignore */
	constructor(
		entries?: Iterable<[string, string]>
		,
		redirect = true,
	) {
		super();
		this.#redirect = redirect;
		if (entries) {
			const iterable =
				entries;
			for (const [k, v] of iterable) {
				this.set(k, v);
			}
		}
	}

	override set(key: string, value: string): this {
		return super.set(normalizeTitle(key), this.#redirect ? normalizeTitle(value) : value);
	}
}
