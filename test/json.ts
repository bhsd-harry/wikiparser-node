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
		const {html, namespaces, nsid} = config;

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

		configs[file] = config;
	}
}

console.log();
const {
	ext,
	html,
	namespaces,
	nsid,
	parserFunction,
	doubleUnderscore,
	img,
	redirection,
	variants,
} = configs['default.json']!;
if (doubleUnderscore[0].length === 0) {
	doubleUnderscore[0] = Object.keys(doubleUnderscore[2]!);
}
for (const [file, config] of Object.entries(configs)) {
	if (file !== 'default.json') {
		info(`${file} vs. default.json`);

		// ext
		for (const tag of config.ext) {
			assert(ext.includes(tag), `'${tag}' not in defaultConfig.ext`);
		}

		// html
		for (const [i, htmls] of config.html.entries()) {
			for (const tag of htmls) {
				assert(html[i]!.includes(tag), `'${tag}' not in defaultConfig.html`);
			}
		}

		// namspaces
		for (const [ns, namespace] of Object.entries(config.namespaces)) {
			assert.strictEqual(namespaces[ns], namespace, `'${ns}' not in defaultConfig.namespaces`);
		}

		// nsid
		for (const [namespace, ns] of Object.entries(config.nsid)) {
			assert.strictEqual(nsid[namespace], ns, `'${namespace}' not in defaultConfig.nsid`);
		}

		// parserFunction
		for (const [alias, canonical] of Object.entries(config.parserFunction[0])) {
			assert.strictEqual(parserFunction[0][alias], canonical, `'${alias}' not in defaultConfig.parserFunction`);
		}
		for (const [i, functions] of (config.parserFunction.slice(1) as string[][]).entries()) {
			for (const f of functions) {
				assert((parserFunction[i + 1] as string[]).includes(f), `'${f}' not in defaultConfig.parserFunction`);
			}
		}
		if (file === 'minimum.json') {
			for (const [alias, canonical] of Object.entries(parserFunction[0])) {
				if (/^#[\w-]+$/u.test(alias)) {
					assert.strictEqual(
						config.parserFunction[0][alias],
						canonical,
						`'${alias}' not in minConfig.parserFunction`,
					);
				}
			}
			for (const f of parserFunction[1]) {
				if (/^#[\w-]+$/u.test(f)) {
					assert(config.parserFunction[1].includes(f), `'${f}' not in minConfig.parserFunction`);
				}
			}
		}

		// doubleUnderscore
		for (const [i, switches] of (config.doubleUnderscore.slice(0, 2) as string[][]).entries()) {
			for (const s of switches) {
				assert((doubleUnderscore[i] as string[]).includes(s), `'${s}' not in defaultConfig.doubleUnderscore`);
			}
		}
		if (config.doubleUnderscore.length === 3) {
			for (const [alias, canonical] of Object.entries(config.doubleUnderscore[2]!)) {
				assert.strictEqual(
					doubleUnderscore[2]![alias],
					canonical,
					`'${alias}' not in defaultConfig.doubleUnderscore`,
				);
			}
		}

		// img
		for (const [alias, canonical] of Object.entries(config.img)) {
			assert.strictEqual(img[alias], canonical, `'${alias}' not in defaultConfig.img`);
		}

		// redirection
		for (const redirect of config.redirection) {
			assert(redirection.includes(redirect), `'${redirect}' not in defaultConfig.redirection`);
		}

		// variants
		for (const variant of config.variants) {
			assert(variants.includes(variant), `'${variant}' not in defaultConfig.variants`);
		}
	}
}
