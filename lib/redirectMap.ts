import {classes} from '../util/constants';

/**
 * 快速规范化页面标题
 * @param title 标题
 */
const normalizeTitle = (title: string): string => {
	const Parser: typeof import('../index') = require('../index');
	return String(Parser.normalizeTitle(title, 0, false, undefined, true));
};

/** 重定向列表 */
export class RedirectMap extends Map<string, string> {
	#redirect;

	/** @ignore */
	constructor(entries?: Iterable<[string, string]> | Record<string, string>, redirect = true) {
		super();
		this.#redirect = redirect;
		if (entries) {
			for (const [k, v] of Symbol.iterator in entries ? entries : Object.entries(entries)) {
				this.set(k, v);
			}
		}
	}

	override set(key: string, value: string): this {
		return super.set(normalizeTitle(key), this.#redirect ? normalizeTitle(value) : value);
	}
}

classes['RedirectMap'] = __filename;
