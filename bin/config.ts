/* eslint-disable n/no-process-exit */

import path from 'path';
import fs from 'fs';
import {spawnSync} from 'child_process';
import assert from 'assert/strict';
import {getEmail} from '@bhsd/nodejs';
import {error} from '../util/diff';
import getConfigFromApi from '../util/config';
import type {MwConfig} from '@bhsd/cm-util';
import type {ConfigData} from '../base';

declare const $PKG: string;
declare const $VERSION: string;

/**
 * Converts an array to an object.
 * @param config parser configuration
 * @param config.articlePath article path
 */
const arrToObj = ({articlePath, ...obj}: ConfigData): Record<string, unknown> => {
	for (const k in obj) {
		const v = obj[k as keyof typeof obj];
		if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
			Object.assign(obj, {[k]: Object.fromEntries(v.map(x => [x, true]))});
		}
	}
	return obj;
};

const pkg = $PKG,
	version = $VERSION;

/**
 * Get the parser configuration for a Wikimedia Foundation project.
 * @param site site nickname
 * @param url script path
 * @param user URI for wiki userpage or email address of the user
 * @param force whether to overwrite the existing configuration
 * @param internal for internal use
 * @throws `RangeError` if the site nickname or script path is missing, or Extension:CodeMirror is not installed
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
		user = getEmail();
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
		tempFile = path.join(__dirname, 'mw.js');
	fs.writeFileSync(tempFile, m);
	const {stdout, stderr} = spawnSync(
		process.execPath,
		[
			'-r',
			'./env.js',
			process.allowedNodeEnvironmentFlags.has('--permission')
				? '--permission'
				: '--experimental-permission',
			`--allow-fs-read=${__dirname}`,
			'--disable-warning=ExperimentalWarning',
			tempFile,
		],
		{cwd: __dirname, encoding: 'utf8', env: {}, timeout: 1e3, killSignal: 'SIGKILL'},
	);
	fs.unlinkSync(tempFile);
	if (stderr) {
		console.error(stderr);
		throw new Error('Failed to execute the fetched MediaWiki module!', {cause: m});
	}
	let mwConfig: MwConfig;
	try {
		mwConfig = JSON.parse(stdout);
	} catch {
		throw new RangeError('Extension:CodeMirror is not installed!');
	}
	const minConfig: ConfigData = require(path.join(dir, 'minimum.json'));
	const config = await getConfigFromApi(minConfig, mwConfig, url, headers);

	// saving configuration
	if (force || !fs.existsSync(file)) {
		fs.writeFileSync(file, `${JSON.stringify(config, null, '\t')}\n`);
	} else {
		const oldConfig = arrToObj(require(file) as ConfigData),
			newConfig = arrToObj(config);
		for (const k in newConfig) {
			try {
				assert.deepStrictEqual(oldConfig[k], newConfig[k]);
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
