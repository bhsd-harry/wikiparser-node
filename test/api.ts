/** @file 为MediaWiki API请求提供Promise界面 */
// @ts-expect-error untyped module
import * as request from '@cypress/request';
import {info} from '../util/diff';
import type {RequestAPI, Request, CoreOptions, RequiredUriUrl} from 'request';

/**
 * 延时
 * @param t 秒数
 */
const sleep = (t: number): Promise<void> => new Promise(resolve => {
	setTimeout(resolve, t * 1000);
});

/**
 * 规范化API请求参数
 * @param obj 请求参数
 * @throws `TypeError` 部分参数不是字符串或数字
 */
const normalizeValues = (
	obj: Record<string, string | number | boolean | (string | number)[] | undefined>,
): Record<string, string | number> => {
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
	return obj as Record<string, string | number>;
};

/** 通用MediaWiki站点的请求 */
export class Api {
	readonly url;
	readonly request = (request as RequestAPI<Request, CoreOptions, RequiredUriUrl>).defaults({jar: true});

	/**
	 * @param url 网址
	 * @throws `RangeError` 无效网址
	 */
	constructor(url: string) {
		try {
			new URL(url);
		} catch {
			throw new RangeError('不是有效的网址！');
		}
		this.url = url;
	}

	/**
	 * GET请求
	 * @param params 请求参数
	 */
	async get(
		params: Record<string, string | number | boolean | (string | number)[] | undefined>,
	): Promise<MediaWikiResponse> {
		params = normalizeValues(params);
		const qs: Record<string, string | number> = {
			action: 'query', format: 'json', formatversion: 2, errorformat: 'plaintext', ...params,
		};
		try {
			return await new Promise((resolve, reject) => {
				this.request.get({url: this.url, qs}, (e, response, body) => {
					const {statusCode} = response;
					if (e) {
						reject({statusCode, ...e});
					} else {
						try {
							const data: MediaWikiResponse = JSON.parse(body as string);
							resolve(data);
						} catch {
							reject({statusCode, body});
						}
					}
				});
			});
		} catch (e) {
			const {statusCode} = e as {statusCode: number};
			if ([500, 502, 504].includes(statusCode)) {
				info(`对网址 ${this.url} 发出的GET请求触发错误代码 ${statusCode}，30秒后将再次尝试。`);
				await sleep(30);
				return this.get(params);
			}
			throw e;
		}
	}
}
