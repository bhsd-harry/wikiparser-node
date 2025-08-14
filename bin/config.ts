/* eslint-disable n/no-process-exit */

import path from 'path';
import fs from 'fs';
import {execSync} from 'child_process';
import assert from 'assert/strict';
import {getParserConfig, getConfig, getVariants, getKeywords} from '@bhsd/cm-util';
import {error} from '../util/diff';
import type {MwConfig, MagicWord} from '@bhsd/cm-util';
import type {ConfigData} from '../base';

declare interface Response {
	query: {
		general: {
			articlepath: string;
			variants?: {code: string}[];
		};
		magicwords: MagicWord[];
		namespaces: Record<number, {name: string, canonical?: string}>;
		namespacealiases: {id: number, alias: string}[];
		functionhooks: string[];
		variables: string[];
	};
}

declare interface Implementation {
	files: Record<string, Function>;
}

declare const $PKG: string;
declare const $VERSION: string;

/**
 * Converts an array to an object.
 * @param config parser configuration
 * @param config.articlePath article path
 */
const arrToObj = ({articlePath, ...obj}: ConfigData): Record<string, unknown> => {
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

/**
 * Execute the data script.
 * @param obj MediaWiki module implementation
 */
const execute = (obj: Implementation): void => {
	Object.entries(obj.files).find(([k]) => k.endsWith('.data.js'))![1]();
};

const mw = { // eslint-disable-line @typescript-eslint/no-unused-vars
	loader: {
		done: false,
		/** @ignore */
		impl(callback: () => [string, Implementation]): void {
			execute(callback()[1]);
		},
		/** @ignore */
		implement(name: string, callback: (() => void) | Implementation): void {
			if (typeof callback === 'object') {
				execute(callback);
			} else if (!this.done) {
				callback();
			}
			if (name.startsWith('ext.CodeMirror.data')) {
				this.done = true;
			}
		},
		/** @ignore */
		state(): void {
			//
		},
	},
	config: {
		/** @ignore */
		set({extCodeMirrorConfig}: {extCodeMirrorConfig: MwConfig}): void {
			mwConfig = extCodeMirrorConfig;
		},
	},
};

const pkg = $PKG,
	version = $VERSION;
let mwConfig: MwConfig | undefined;

/**
 * Get the parser configuration for a Wikimedia Foundation project.
 * @param site site nickname
 * @param url script path
 * @param user URI for wiki userpage or email address of the user
 * @param force whether to overwrite the existing configuration
 * @param internal for internal use
 */
export default async (
	site: string,
	url: string,
	user?: string,
	force?: boolean,
	internal?: boolean,
): Promise<ConfigData> => {
	// wrong calls
	if (!site || !url) {
		if (internal) {
			throw new RangeError('Site nickname and script path are required!');
		} else {
			error('Usage: npx getParserConfig <site> <script path> [user] [force]');
			process.exit(1);
		}
	}

	// internal calls with stored configuration
	const dir = path.join('..', '..', 'config'),
		file = path.join(__dirname, dir, `${site}.json`);
	if (internal && !force && fs.existsSync(file)) {
		return require(file) as ConfigData;
	}

	// fetching configuration
	if (/(?:\.php|\/)$/u.test(url)) {
		url = url.slice(0, url.lastIndexOf('/'));
	}
	if (user === 'git') {
		user = execSync('git config user.email', {encoding: 'utf8'}).trim();
	}
	const headers = user
			? {
				headers: {
					'User-Agent': `${pkg}/${version} (https://www.npmjs.com/package/${pkg}; ${user}) Node.js/${
						process.version
					}`,
				},
			}
			: undefined,
		m = await (await fetch(`${url}/load.php?modules=ext.CodeMirror.data|ext.CodeMirror`, headers)).text(),
		params = {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'general|magicwords|functionhooks|namespaces|namespacealiases',
			format: 'json',
			formatversion: '2',
		},
		{
			query: {
				general: {articlepath, variants},
				magicwords,
				namespaces,
				namespacealiases,
				functionhooks,
			},
		} = await (
			await fetch(`${url}/api.php?${new URLSearchParams(params).toString()}`, headers)
		).json() as Response;
	eval(m); // eslint-disable-line no-eval
	if (!mwConfig) {
		throw new RangeError('Extension:CodeMirror is not installed!');
	}
	const ns = Object.entries(namespaces).filter(([id]) => filterGadget(id))
			.flatMap(([id, {name, canonical = ''}]): (readonly [string, string])[] => [
				[id, name],
				...name === canonical ? [] : [[id, canonical] as const],
			]),
		config: ConfigData = {
			...getParserConfig(require(path.join(dir, 'minimum')) as ConfigData, mwConfig),
			...getKeywords(magicwords),
			variants: getVariants(variants),
			namespaces: Object.fromEntries(ns),
			nsid: Object.fromEntries([
				...ns.map(([id, canonical]) => [canonical.toLowerCase(), Number(id)]),
				...namespacealiases.filter(({id}) => filterGadget(id)).map(({id, alias}) => [alias.toLowerCase(), id]),
			]),
			articlePath: articlepath,
		};
	config.doubleUnderscore[0] = [];
	config.doubleUnderscore[1] = [];
	Object.assign(config.parserFunction[0], getConfig(magicwords, ({name}) => name === 'msgnw'));
	config.parserFunction[2] = getAliases(magicwords, new Set(['msg', 'raw']));
	config.parserFunction[3] = getAliases(magicwords, new Set(['subst', 'safesubst']));
	if (!mwConfig.functionHooks) {
		Object.assign(config, {functionHook: [...functionhooks.map(s => s.toLowerCase()), 'msgnw']});
	}
	if (!mwConfig.variableIDs) {
		const {query: {variables}} = await (
			await fetch(
				`${url}/api.php?${new URLSearchParams({...params, siprop: 'variables'}).toString()}`,
				headers,
			)
		).json() as Response;
		Object.assign(config, {variable: [...new Set([...variables, '='])]});
	}
	if ('#choose' in config.parserFunction[0]) {
		delete config.parserFunction[0]['choose'];
		const i = config.variable.indexOf('choose');
		if (i !== -1) {
			config.variable.splice(i, 1);
		}
	}

	// saving configuration
	if (force || !fs.existsSync(file)) {
		fs.writeFileSync(file, `${JSON.stringify(config, null, '\t')}\n`);
	} else {
		const oldConfig = arrToObj(require(file) as ConfigData),
			newConfig = arrToObj(config);
		for (const [k, v] of Object.entries(newConfig)) {
			try {
				assert.deepStrictEqual(oldConfig[k], v);
			} catch (e) {
				if (e instanceof assert.AssertionError) {
					error(`Configuration mismatch for "${k}"`);
					delete e.actual;
					delete e.expected;
				}
				throw e;
			}
		}
	}
	return config;
};
