import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import {info} from '../util/diff';
import type {Config} from '../base';

const configs: Record<string, Config> = {};
for (const file of fs.readdirSync('config')) {
	if (!file.startsWith('.')) {
		info(file);
		const config: Config = require(path.join('..', '..', 'config', file));
		const {html, namespaces, nsid, doubleUnderscore} = config;

		// ext/variable/interwiki/redirection/variants
		for (const key of ['ext', 'variable', 'interwiki', 'redirection', 'variants'] as const) {
			const v = config[key];
			assert.strictEqual(v.length, new Set(v).size, `${key} not unique`);
		}

		// html
		const htmls = html.flat();
		assert.strictEqual(htmls.length, new Set(htmls).size, 'htmls not unique');

		// namespaces/nsid
		for (const [ns, namespace] of Object.entries(namespaces)) {
			assert.equal(nsid[namespace.toLowerCase()], ns, `'${namespace}' not in nsid`);
		}
		for (const ns of new Set(Object.values(nsid))) {
			assert(ns in namespaces, `'${ns}' not in namespaces`);
		}

		// parserFunction
		const {parserFunction} = config;
		for (let i = 2; i < 4; i++) {
			assert.strictEqual(
				parserFunction[i as 2 | 3].length,
				new Set(parserFunction[i as 2 | 3]).size,
				`parserFunction[${i}] not unique`,
			);
		}

		// doubleUnderscore (browser)
		for (let i = 0; i < 2; i++) {
			if (doubleUnderscore.length > i + 2 && doubleUnderscore[i as 0 | 1].length > 0) {
				assert.strictEqual(
					doubleUnderscore[i]!.length,
					Object.keys(doubleUnderscore[i + 2]!).length,
					`inconsistent doubleUnderscore[${i}] and doubleUnderscore[${i + 2}]`,
				);
				for (const alias of doubleUnderscore[i as 0 | 1]) {
					assert(alias in doubleUnderscore[i + 2]!, `'${alias}' not in doubleUnderscore[${i + 2}]`);
				}
			}
		}

		configs[file] = config;
	}
}

console.log();
const defaultConfig = configs['default.json']!,
	{parserFunction} = defaultConfig;
for (const [file, config] of Object.entries(configs)) {
	if (file !== 'default.json') {
		info(`${file} vs. default.json`);

		// ext/variable/redirection/variants
		for (const key of ['ext', 'variable', 'redirection', 'variants'] as const) {
			for (const ele of config[key]) {
				assert(defaultConfig[key].includes(ele), `'${ele}' not in defaultConfig.${key}`);
			}
		}

		// html/parserFunction
		for (const key of ['html', 'parserFunction'] as const) {
			for (const [i, arr] of config[key].entries()) {
				if (Array.isArray(arr)) {
					for (const ele of arr) {
						assert(
							(defaultConfig[key][i] as string[]).includes(ele),
							`'${ele}' not in defaultConfig.${key}[${i}]`,
						);
					}
				}
			}
		}

		// namspaces/nsid/img
		for (const key of ['namespaces', 'nsid', 'img'] as const) {
			for (const [k, v] of Object.entries(config[key])) {
				assert.strictEqual(defaultConfig[key][k], v, `'${k}' not in defaultConfig.${key}`);
			}
		}

		// parserFunction/doubleUnderscore
		for (const key of ['parserFunction', 'doubleUnderscore'] as const) {
			for (const [i, obj] of config[key].entries()) {
				if (obj && !Array.isArray(obj)) {
					for (const [alias, canonical] of Object.entries(obj)) {
						assert.strictEqual(
							(defaultConfig[key][i] as Record<string, string>)[alias],
							canonical,
							`'${alias}' not in defaultConfig.${key}[${i}]`,
						);
					}
				}
			}
		}

		if (file === 'minimum.json') {
			// parserFunction
			for (let i = 0; i < 2; i++) {
				for (const [alias, canonical] of Object.entries(parserFunction[i]!)) {
					if (/^#[\w-]+$/u.test(alias)) {
						assert.strictEqual(
							(config.parserFunction[i] as Record<string, string>)[alias],
							canonical,
							`'${alias}' not in minConfig.parserFunction[${i}]`,
						);
					}
				}
			}
		}
	}
}
