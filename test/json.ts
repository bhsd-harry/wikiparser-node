import fs from 'fs';
import path from 'path';
import assert from 'assert';
import type {Config, SignatureData} from '../base';

const basePath = path.join('..', '..');

const configs: Record<string, Config> = {};
for (const file of fs.readdirSync('config')) {
	if (!file.startsWith('.')) {
		describe(file, () => {
			const config: Config = require(path.join(basePath, 'config', file));
			const {html, namespaces, nsid, doubleUnderscore} = config;

			// ext/variable/redirection/variants
			for (const key of ['ext', 'variable', 'redirection', 'variants'] as const) {
				it(key, () => {
					const v = config[key];
					assert.strictEqual(v.length, new Set(v).size, `${key} not unique`);
				});
			}

			it('html', () => {
				const htmls = html.flat();
				assert.strictEqual(htmls.length, new Set(htmls).size, 'htmls not unique');
			});

			it('nsid', () => {
				for (const [ns, namespace] of Object.entries(namespaces)) {
					assert.equal(nsid[namespace.toLowerCase()], ns, `'${namespace}' not in nsid`);
				}
			});
			it('namespaces', () => {
				for (const ns of new Set(Object.values(nsid))) {
					assert(ns in namespaces, `'${ns}' not in namespaces`);
				}
			});

			it('parserFunction', () => {
				const {parserFunction} = config;
				for (let i = 2; i < 4; i++) {
					assert.strictEqual(
						parserFunction[i as 2 | 3].length,
						new Set(parserFunction[i as 2 | 3]).size,
						`parserFunction[${i}] not unique`,
					);
				}
			});

			it('doubleUnderscore (browser)', () => {
				for (let i = 0; i < 2; i++) {
					if (doubleUnderscore.length > i + 2 && doubleUnderscore[i as 0 | 1].length > 0) {
						assert.strictEqual(
							doubleUnderscore[i]!.length,
							Object.keys(doubleUnderscore[i + 2]!).length,
							`inconsistent doubleUnderscore[${i}] and doubleUnderscore[${i + 2}]`,
						);
						for (const alias of doubleUnderscore[i as 0 | 1]) {
							assert(
								alias in doubleUnderscore[i + 2]!,
								`'${alias}' not in doubleUnderscore[${i + 2}]`,
							);
						}
					}
				}
			});

			configs[file] = config;
		});
	}
}

const defaultConfig = configs['default.json']!,
	{parserFunction, doubleUnderscore} = defaultConfig;
for (const [file, config] of Object.entries(configs)) {
	if (file !== 'default.json' && file !== 'jawiki.json') {
		describe(`${file} vs. default.json`, () => {
			// ext/variable/redirection/variants
			for (const key of ['ext', 'variable', 'redirection', 'variants'] as const) {
				it(key, () => {
					for (const ele of config[key]) {
						assert(defaultConfig[key].includes(ele), `'${ele}' not in defaultConfig.${key}`);
					}
				});
			}

			// html/parserFunction
			for (const key of ['html', 'parserFunction'] as const) {
				it(key, () => {
					for (let i = 0; i < config[key].length; i++) {
						const arr = config[key][i]!;
						if (Array.isArray(arr)) {
							for (const ele of arr) {
								assert(
									(defaultConfig[key][i] as string[]).includes(ele),
									`'${ele}' not in defaultConfig.${key}[${i}]`,
								);
							}
						}
					}
				});
			}

			// namspaces/nsid/img
			for (const key of ['namespaces', 'nsid', 'img'] as const) {
				it(key, () => {
					for (const [k, v] of Object.entries(config[key])) {
						assert.strictEqual(defaultConfig[key][k], v, `'${k}' not in defaultConfig.${key}`);
					}
				});
			}

			// parserFunction/doubleUnderscore
			for (const key of ['parserFunction', 'doubleUnderscore'] as const) {
				it(key, () => {
					for (let i = 0; i < config[key].length; i++) {
						const obj = config[key][i]!;
						if (!Array.isArray(obj)) {
							for (const [alias, canonical] of Object.entries(obj)) {
								assert.strictEqual(
									(defaultConfig[key][i] as Record<string, string>)[alias],
									canonical,
									`'${alias}' not in defaultConfig.${key}[${i}]`,
								);
							}
						}
					}
				});
			}

			if (file === 'minimum.json') {
				it('minimum parserFunction', () => {
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
				});
			}
		});
	}
}

const {
	behaviorSwitches,
	parserFunctions,
} = require(path.join(basePath, 'data', 'signatures.json')) as SignatureData;
const doubleUnderscores = (doubleUnderscore.slice(2) as Record<string, string>[]).flatMap(Object.keys)
		.map(s => s.toLowerCase()),
	magicWords = [parserFunction.slice(0, 2).map(Object.keys), parserFunction.slice(2) as string[][]]
		.flat(2)
		.map(s => s.toLowerCase()),
	behaviorSwitchNames = behaviorSwitches.flatMap(({aliases}) => aliases),
	parserFunctionNames = parserFunctions.flatMap(({aliases}) => aliases);
describe('signatures.json', () => {
	it('behaviorSwitch signatures', () => {
		assert.strictEqual(
			behaviorSwitchNames.length,
			new Set(behaviorSwitchNames).size,
			'Duplicate magic words',
		);
		for (const word of behaviorSwitchNames) {
			assert.ok(doubleUnderscores.includes(word), `Missing: ${word}`);
		}
	});

	it('parserFunction signatures', () => {
		assert.strictEqual(
			parserFunctionNames.length,
			new Set(parserFunctionNames).size,
			'Duplicate magic words',
		);
		for (const word of parserFunctionNames) {
			assert.ok(magicWords.includes(word), `Missing: ${word}`);
		}
	});
});
