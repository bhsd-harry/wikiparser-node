import fs from 'fs';
import path from 'path';
import assert from 'assert';
import type {ConfigData, SignatureData} from '../base';

const basePath = path.join('..', '..');

const configs: Record<string, ConfigData> = {};
for (const file of fs.readdirSync('config')) {
	if (!file.startsWith('.')) {
		describe(file, () => {
			const config: ConfigData = require(path.join(basePath, 'config', file));
			const {html, namespaces, nsid, doubleUnderscore, parserFunction, variable, functionHook, img} = config,
				magicWords = parserFunction.slice(0, 2) as Record<string, string>[],
				magicWordKeys = magicWords.flatMap(Object.keys),
				magicWordValues = magicWords.flatMap(Object.values<string>);

			// ext/variable/functionHook/redirection/variants
			for (const key of ['ext', 'variable', 'functionHook', 'redirection', 'variants'] as const) {
				it(key, () => {
					const v = config[key];
					assert.strictEqual(v.length, new Set(v).size, `${key} not unique`);
					if (key === 'variable' || key === 'functionHook') {
						for (const word of v) {
							assert(magicWordValues.includes(word), `'${word}' not in parserFunction`);
						}
					}
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

			it('doubleUnderscore', () => {
				const keys = (doubleUnderscore.slice(2) as Record<string, string>[]).flatMap(Object.keys);
				assert.strictEqual(keys.length, new Set(keys).size, 'doubleUnderscore not unique');
			});

			if (file !== 'minimum.json') {
				it('parserFunction', () => {
					assert.strictEqual(
						magicWordKeys.length,
						new Set(magicWordKeys).size,
						'parserFunction not unique',
					);
					for (let i = 2; i < 4; i++) {
						assert.strictEqual(
							parserFunction[i as 2 | 3].length,
							new Set(parserFunction[i as 2 | 3]).size,
							`parserFunction[${i}] not unique`,
						);
					}
					for (const alias of [...variable, ...functionHook]) {
						assert(magicWordValues.includes(alias), `'${alias}' not in parserFunction`);
					}
				});

				it('img', () => {
					const entries = Object.entries(img),
						constants = new Set(entries.filter(([k]) => !k.includes('$1')).map(([, v]) => v)),
						variables = new Set(entries.filter(([k]) => k.includes('$1')).map(([, v]) => v));
					assert(constants.has('upright'), `'upright' not in img`);
					assert(variables.has('upright'), `'manual-upright' not in img`);
					assert.strictEqual(
						constants.size + variables.size - 1,
						new Set([...constants, ...variables]).size,
						'img not unique',
					);
				});
			}

			configs[file] = config;
		});
	}
}

const defaultConfig = configs['default.json']!,
	{parserFunction, doubleUnderscore} = defaultConfig;
for (const [file, config] of Object.entries(configs)) {
	if (file !== 'default.json') {
		describe(`${file} vs. default.json`, () => {
			// ext/variable/functionHook/redirection/variants
			for (const key of ['ext', 'variable', 'functionHook', 'redirection', 'variants'] as const) {
				it(key, () => {
					for (const ele of config[key]) {
						assert(defaultConfig[key].includes(ele), `'${ele}' not in defaultConfig.${key}`);
					}
				});
			}

			// html/parserFunction
			for (const key of ['html', 'parserFunction'] as const) {
				it(`arrays of ${key}`, () => {
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
						if (file === 'jawiki.json') {
							assert(k in defaultConfig[key], `'${k}' not in defaultConfig.${key}`);
						} else {
							assert.strictEqual(defaultConfig[key][k], v, `'${k}' not in defaultConfig.${key}`);
						}
					}
				});
			}

			// parserFunction/doubleUnderscore
			for (const key of ['parserFunction', 'doubleUnderscore'] as const) {
				it(`objects of ${key}`, () => {
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

			it('protocol', () => {
				for (const protocol of config.protocol.split('|')) {
					assert(
						new RegExp(String.raw`(?:^|\|)${protocol}(?:$|\|)`, 'u').test(defaultConfig.protocol),
						`'${protocol}' not in defaultConfig.protocol`,
					);
				}
			});

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

let baseI18nFile: string | undefined,
	baseI18n: Set<string> | undefined;
describe('i18n', () => {
	for (const file of fs.readdirSync('i18n')) {
		const i18n = new Set(Object.keys(require(path.join(basePath, 'i18n', file)) as Record<string, string>));
		if (baseI18n) {
			it(`${baseI18nFile} vs. file`, () => { // eslint-disable-line @typescript-eslint/no-loop-func
				for (const key of i18n) {
					assert(baseI18n!.has(key), `'${key}' not in ${baseI18nFile}`);
				}
				for (const key of baseI18n!) {
					assert(i18n.has(key), `'${key}' not in ${file}`);
				}
			});
		} else {
			baseI18nFile = file;
			baseI18n = i18n;
		}
	}
});
