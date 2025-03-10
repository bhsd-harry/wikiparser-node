/* eslint-disable n/no-process-exit */

import path from 'path';
import fs from 'fs';
import assert from 'assert';
import {getParserConfig, getConfig, getVariants, getKeywords} from '@bhsd/common/dist/cm';
import type {MwConfig, MagicWord} from '@bhsd/common/dist/cm';
import type {Config} from '../base';

declare interface Response {
	query: {
		general: {
			variants?: {code: string}[];
		};
		magicwords: MagicWord[];
		namespaces: Record<number, {name: string, canonical?: string}>;
		namespacealiases: {id: number, alias: string}[];
		variables?: string[];
	};
}

const {argv} = process,
	[,, site,, force, old] = argv;
let [,,, url] = argv;
if (!site || !url) {
	console.error('Usage: npx getParserConfig <site> <script path> [force]');
	process.exit(1);
} else if (/(?:\.php|\/)$/u.test(url)) {
	url = url.slice(0, url.lastIndexOf('/'));
}

let mwConfig: MwConfig | undefined;
const mw = { // eslint-disable-line @typescript-eslint/no-unused-vars
	loader: {
		/** @ignore */
		impl(callback: () => [string, {files: Record<string, Function>}]): void {
			Object.entries(callback()[1].files).find(([k]) => k.endsWith('.data.js'))![1]();
		},
		/** @ignore */
		implement(_: string, callback: () => void): void {
			callback();
		},
	},
	config: {
		/** @ignore */
		set({extCodeMirrorConfig}: {extCodeMirrorConfig: MwConfig}): void {
			mwConfig = extCodeMirrorConfig;
		},
	},
};

/**
 * Converts an array to an object.
 * @param config parser configuration
 * @param config.articlePath article path
 */
const arrToObj = ({articlePath, ...obj}: Config): object => {
	for (const [k, v] of Object.entries(obj)) {
		if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
			Object.assign(obj, {[k]: Object.fromEntries(v.map(x => [x, true]))});
		}
	}
	return obj;
};

/**
 * Gets the aliases of magic words.
 * @param magicwords magic words
 * @param targets magic word names
 */
const getAliases = (magicwords: MagicWord[], targets: Set<string>): string[] => magicwords
	.filter(({name}) => targets.has(name))
	.flatMap(({aliases}) => aliases.map(s => s.replace(/:$/u, '').toLowerCase()));

/**
 * Filters out gadget-related namespaces.
 * @param id namespace ID
 */
const filterGadget = (id: string | number): boolean => {
	const n = Number(id);
	return n < 2300 || n > 2303; // Gadget, Gadget talk, Gadget definition, Gadget definition talk
};

(async () => {
	const m = await (await fetch(`${url}/load.php?modules=ext.CodeMirror${old ? '.data' : ''}`)).text(),
		params = {
			action: 'query',
			meta: 'siteinfo',
			siprop: `general|magicwords|namespaces|namespacealiases${old ? '|variables' : ''}`,
			format: 'json',
			formatversion: '2',
		},
		{query: {general: {variants}, magicwords, namespaces, namespacealiases, variables}} = await (
			await fetch(`${url}/api.php?${new URLSearchParams(params).toString()}`)
		).json() as Response;
	eval(m); // eslint-disable-line no-eval
	const dir = path.join('..', '..', 'config'),
		ns = Object.entries(namespaces).filter(([id]) => filterGadget(id))
			.flatMap(([id, {name, canonical = ''}]): (readonly [string, string])[] => [
				[id, name],
				...name === canonical ? [] : [[id, canonical] as const],
			]),
		config: Config = {
			...getParserConfig(require(path.join(dir, 'minimum')) as Config, mwConfig!),
			...getKeywords(magicwords),
			variants: getVariants(variants),
			namespaces: Object.fromEntries(ns),
			nsid: Object.fromEntries([
				...ns.map(([id, canonical]) => [canonical.toLowerCase(), Number(id)]),
				...namespacealiases.filter(({id}) => filterGadget(id)).map(({id, alias}) => [alias.toLowerCase(), id]),
			]),
			...old && {variable: [...variables!, '=']},
			articlePath: '/wiki/$1',
		};
	config.doubleUnderscore[0] = [];
	config.doubleUnderscore[1] = [];
	Object.assign(config.parserFunction[0], getConfig(magicwords, ({name}) => name === 'msgnw'));
	if ('#choose' in config.parserFunction[0]) {
		delete config.parserFunction[0]['choose'];
		const i = config.variable.indexOf('choose');
		if (i !== -1) {
			config.variable.splice(i, 1);
		}
	}
	config.parserFunction[2] = getAliases(magicwords, new Set(['msg', 'raw']));
	config.parserFunction[3] = getAliases(magicwords, new Set(['subst', 'safesubst']));
	const file = path.join(__dirname, dir, `${site}.json`),
		exists = fs.existsSync(file);
	if (exists) {
		assert.deepStrictEqual(arrToObj(require(file) as Config), arrToObj(config));
	}
	if (force || !exists) {
		fs.writeFileSync(file, `${JSON.stringify(config, null, '\t')}\n`);
	}
})();
