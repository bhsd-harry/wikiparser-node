/** @file 为MediaWiki API请求提供Promise界面 */
'use strict';
const request = require('request'),
	{info} = require('..'),
	{sleep} = require('../util/base');

/**
 * 规范化API请求参数
 * @param {Record<string, string|number|boolean|(string|number)[]>} obj 请求参数
 * @throws `TypeError` 部分参数不是字符串或数字
 */
const normalizeValues = obj => {
	for (const [key, val] of Object.entries(obj)) {
		if (val === undefined || val === false) {
			delete obj[key];
		} else if (val === true) {
			obj[key] = 1;
		} else if (Array.isArray(val)) {
			obj[key] = val.join('|');
		} else if (typeof val !== 'string' && typeof val !== 'number') {
			throw new TypeError('API请求的各项参数均为字符串或数字！');
		}
	}
	// eslint-disable-next-line no-extra-parens
	return /** @type {Record<string, string>} */ (obj);
};

/** 通用MediaWiki站点的请求 */
class Api {
	url;
	request = request.defaults({jar: true});

	/**
	 * @param {string} url 网址
	 * @throws `RangeError` 无效网址
	 */
	constructor(url) {
		try {
			new URL(url);
		} catch {
			throw new RangeError('不是有效的网址！');
		}
		this.url = url;
	}

	/**
	 * GET请求
	 * @param {Record<string, string|number|boolean|(string|number)[]>} params 请求参数
	 * @returns {Promise<*>}
	 */
	async get(params) {
		params = normalizeValues(params);
		const qs = {action: 'query', format: 'json', formatversion: 2, errorformat: 'plaintext', ...params};
		try {
			return await new Promise((resolve, reject) => {
				this.request.get({url: this.url, qs}, (e, response, body) => {
					const statusCode = response?.statusCode;
					if (e) {
						reject({statusCode, ...e});
					} else {
						try {
							const data = JSON.parse(body);
							resolve(data);
						} catch {
							reject({statusCode, body});
						}
					}
				});
			});
		} catch (e) {
			if ([500, 502, 504].includes(e.statusCode)) {
				info(`对网址 ${this.url} 发出的GET请求触发错误代码 ${e.statusCode}，30秒后将再次尝试。`);
				await sleep(30);
				return this.get(params);
			}
			throw e;
		}
	}
}

module.exports = Api;
