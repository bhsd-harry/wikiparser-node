/* eslint-disable n/no-process-exit */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import Parser from '../index';
import type {Chalk} from 'chalk';
import type {LintError} from '../base';
import type {LintConfiguration} from '../lib/lintConfig';

declare type CacheItems = Record<string, [number, string, number, LintError[]]>;
declare interface Cache {
	include: CacheItems;
	noinclude: CacheItems;
}

const chalk = ((): Chalk => {
	try {
		return require('chalk');
	} catch {
		const f = ((text: string): string => text) as Chalk,
			proxy = new Proxy(f, {
				/** @private */
				get(): Chalk {
					return proxy;
				},
			});
		return proxy;
	}
})();

const man = `
Available options:
-c, --config <path or preset config>    Choose parser's configuration
--cache                                 Enable caching
--cache-file <path>                     Specify cache file
--ext <extension>                       Specify file extension
--fix                                   Automatically fix problems
-h, --help                              Print available options
-i, --include                           Parse for inclusion
--ignore <pattern>                      Ignore files that match the pattern
-l, --lang <path or preset language>    Choose i18n language
--lc, --lint-config <path>              Specify lint config file
-q, --quiet                             Report errors only
-r, --recursive                         Lint files in directories recursively
-s, --strict                            Exit when there is an error or warning
                                        Override -q or --quiet
-v, --version                           Print package version
`,
	root = path.join(__dirname, '..', '..'),
	configPath = path.join(root, 'config'),
	preset = new Set(
		fs.readdirSync(configPath).filter(file => file.endsWith('.json'))
			.map(file => file.slice(0, -5)),
	),
	lintConfigDefaults = ['.wikilintrc.json', '.wikilintrc.js', '.wikilintrc.cjs', '.wikilintrc.mjs'],
	i18n = new Set(
		fs.readdirSync(path.join(root, 'i18n')).filter(file => file.endsWith('.json'))
			.map(file => file.slice(0, -5)),
	),
	{argv} = process,
	exts: string[] = [],
	ignorePatterns: string[] = [],
	jobs: Promise<void>[] = [];
let files: string[] = [],
	lintConfigFile: string | undefined,
	cacheFile = '.wikilintcache',
	cache: Cache | undefined,
	exiting = false,
	fixing = false,
	include = false,
	quiet = false,
	recursive = false,
	strict = false,
	caching = false,
	nErr = 0,
	nWarn = 0,
	nFixableErr = 0,
	nFixableWarn = 0,
	option: string;

/**
 * exit with message
 * @param msg message
 */
const exit = (msg: string): never => {
	console.error(msg);
	process.exit(1);
};

/**
 * throw if input is incorrect
 * @param input input string
 * @param opt option name
 * @param spec option specification
 * @throws `Error` incomplete input
 */
const throwOnInput = (input: string | undefined, opt: string, spec: string): input is string => {
	if (!input || input.startsWith('-')) {
		exit(`The option ${opt} must be followed by ${spec}`);
	}
	return true;
};

/**
 * throw if `-c` or `--config` option is incorrect
 * @param config config input
 * @throws `Error` unrecognized config input
 */
const throwOnConfig = (config: string | undefined): void => {
	if (throwOnInput(config, '-c/--config', 'a path or a preset config')) {
		if (!config.includes('/') && !preset.has(config)) {
			exit(`Unrecognized preset config: ${config}`);
		}
		Parser.config = config;
	}
};

/**
 * throw if `--lc` or `--lint-config` option is incorrect
 * @param config lintConfig input
 * @throws `Error` unrecognized lintConfig input
 */
const throwOnLintConfig = (config: string | undefined): void => {
	if (throwOnInput(config, '--lc/--lint-config', 'a path')) {
		lintConfigFile = path.resolve('.', config);
	}
};

/**
 * load lintConfig
 * @param file lintConfig file path
 */
const loadLintConfig = async (file: string): Promise<LintConfiguration> => {
	const symbol = Symbol('lintConfig');
	let lintConfig: unknown = symbol;
	try {
		lintConfig = require(file);
	} catch {}
	if (lintConfig === symbol) {
		lintConfig = await import(file);
	}
	if (lintConfig && typeof lintConfig === 'object' && 'default' in lintConfig) {
		lintConfig = lintConfig.default;
	}
	if (lintConfig !== undefined && lintConfig !== null && typeof lintConfig !== 'object') {
		exit(`Not a valid lint config file: ${lintConfigFile}`);
	}
	return lintConfig as LintConfiguration;
};

/**
 * throw if `-l` or `--lang` option is incorrect
 * @param lang lang input
 * @throws `Error` unrecognized lang input
 */
const throwOnLang = (lang: string | undefined): void => {
	if (throwOnInput(lang, '-l/--lang', 'a path or a preset language')) {
		if (!lang.includes('/') && !i18n.has(lang)) {
			exit(`Unrecognized preset language: ${lang}`);
		}
		Parser.i18n = lang;
	}
};

/**
 * throw if `--ext` option is incorrect
 * @param ext ext input
 */
const throwOnExt = (ext: string | undefined): void => {
	if (throwOnInput(ext, '--ext', 'a list of file extensions joined by commas')) {
		exts.push(...ext.split(',').map(s => {
			const e = s.trim();
			return e.startsWith('.') ? e : `.${e}`;
		}));
	}
};

/**
 * throw if `--ignore` option is incorrect
 * @param ignore ignore input
 */
const throwOnIgnore = (ignore: string | undefined): void => {
	if (throwOnInput(ignore, '--ignore', 'a glob pattern')) {
		ignorePatterns.push(path.join('**', ignore));
	}
};

/**
 * throw if `--cache-file` option is incorrect
 * @param input cache file input
 */
const throwOnCacheFile = (input: string | undefined): void => {
	if (throwOnInput(input, '--cache-file', 'a path')) {
		cacheFile = input;
		caching = true;
	}
};

/**
 * generate plural form if necessary
 * @param n number of items
 * @param word item name
 */
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * color the severity
 * @param severity problem severity
 */
const coloredSeverity = (severity: 'error' | 'warning'): string =>
	chalk[severity === 'error' ? 'red' : 'yellow'](severity.padEnd(7));

for (let i = 2; i < argv.length; i++) {
	option = argv[i]!;
	switch (option) {
		case '-c':
		case '--config':
			throwOnConfig(argv[++i]);
			break;
		case '--lc':
		case '--lint-config':
			throwOnLintConfig(argv[++i]);
			break;
		case '--cache':
			caching = true;
			break;
		case '--cache-file':
			throwOnCacheFile(argv[++i]);
			break;
		case '--ext':
			throwOnExt(argv[++i]);
			break;
		case '--fix':
			fixing = true;
			break;
		case '-h':
		case '--help':
			console.log(man);
			process.exit(0);
			break;
		case '-i':
		case '--include':
			include = true;
			break;
		case '--ignore':
			throwOnIgnore(argv[++i]);
			break;
		case '-l':
		case '--lang':
			throwOnLang(argv[++i]);
			break;
		case '-q':
		case '--quiet':
			quiet = true;
			break;
		case '-r':
		case '--recursive':
			recursive = true;
			break;
		case '-s':
		case '--strict':
			strict = true;
			break;
		case '-v':
		case '--version': {
			const {version} = require('../../package') as {version: string};
			console.log(`wikilint v${version}`);
			process.exit(0);
			break;
		}
		default: {
			let known = true;
			if (option.includes('=')) {
				const j = option.indexOf('='),
					value = option.slice(j + 1);
				switch (option.slice(0, j)) {
					case '--config':
						throwOnConfig(value);
						break;
					case '--cache-file':
						throwOnCacheFile(value);
						break;
					case '--ext':
						throwOnExt(value);
						break;
					case '--ignore':
						throwOnIgnore(value);
						break;
					case '--lang':
						throwOnLang(value);
						break;
					default:
						known = false;
				}
			} else {
				known = false;
			}
			if (!known) {
				if (option.startsWith('-')) {
					exit(`Unknown wikilint option: ${option}\n${man}`);
				}
				files.push(option);
			}
		}
	}
}
if (files.length === 0) {
	exit('No target file is specified');
}
if (quiet && strict) {
	quiet = false;
	console.error('-s or --strict will override -q or --quiet\n');
}
if (recursive) {
	files = files.flatMap(file => {
		if (fs.statSync(file).isFile()) {
			return file;
		}
		return fs.readdirSync(file, {recursive: true, withFileTypes: true}).filter(dir => dir.isFile())
			.map(dir => path.join(dir.parentPath, dir.name));
	});
}
if (exts.length > 0) {
	files = files.filter(file => exts.some(e => file.endsWith(e)));
}

if (caching) {
	if (fs.existsSync(cacheFile)) {
		try {
			cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
			/* eslint-disable @typescript-eslint/no-unnecessary-condition */
			assert.ok(
				typeof cache === 'object' && cache !== null
				&& typeof cache.include === 'object' && cache.include !== null
				&& typeof cache.noinclude === 'object' && cache.noinclude !== null,
			);
			/* eslint-enable @typescript-eslint/no-unnecessary-condition */
		} catch {
			exit(`Invalid cache file: ${cacheFile}`);
		}
	} else {
		cache = {
			include: {},
			noinclude: {},
		};
	}
}
let config = Parser.config as string;
config = (
	config.includes('/')
		? path.resolve(Parser.config as string)
		: path.join(configPath, Parser.config as string)
) + (config.endsWith('.json') ? '' : '.json');
const {mtimeMs} = fs.statSync(config),
	obj = cache?.[include ? 'include' : 'noinclude'];

let minimatch: (file: string, pattern: string) => boolean;
try {
	({minimatch} = require('minimatch'));
} catch {
	minimatch = path.matchesGlob.bind(path); // eslint-disable-line n/no-unsupported-features/node-builtins
}

(async () => {
	if (lintConfigFile) {
		try {
			Parser.lintConfig = await loadLintConfig(lintConfigFile);
		} catch {
			exit(`Cannot load lint config file: ${lintConfigFile}`);
		}
	} else {
		await (async () => {
			let cur = process.cwd(),
				last: string | undefined;
			while (last !== cur) {
				for (const file of lintConfigDefaults) {
					try {
						Parser.lintConfig = await loadLintConfig(path.join(cur, file));
						return;
					} catch {}
				}
				last = cur;
				cur = path.dirname(cur);
			}
		})();
	}
	Parser.lintConfig.computeEditInfo = false;
	Parser.lintConfig.fix = true;

	for (const file of new Set(files.map(f => path.resolve(f)))) {
		const stat = fs.statSync(file);
		if (stat.isDirectory()) {
			console.error(`"${file}" is a directory. Please use -r or --recursive to lint directories.`);
			exiting = true;
			continue;
		} else if (ignorePatterns.some(ignore => minimatch(file, ignore))) {
			continue;
		}
		const fileCache = obj?.[file];
		let wikitext = fs.readFileSync(file, 'utf8'),
			problems: LintError[] & {output?: string},
			update = false;
		if (caching && fileCache?.[0] === stat.mtimeMs && fileCache[1] === config && fileCache[2] === mtimeMs) {
			[,,, problems] = fileCache;
		} else {
			problems = Parser.lint(wikitext, include);
			update = true;
		}
		if (fixing && problems.output !== undefined) {
			wikitext = problems.output;
			jobs.push(fs.promises.writeFile(file, wikitext));
			problems = Parser.lint(wikitext, include);
			update = true;
		}
		if (caching && update) {
			obj![file] = [stat.mtimeMs, config, mtimeMs, problems];
		}
		const errors = problems.filter(({severity}) => severity === 'error'),
			fixable = problems.filter(({fix}) => fix),
			nLocalErr = errors.length,
			nLocalWarn = problems.length - nLocalErr,
			nLocalFixableErr = fixable.filter(({severity}) => severity === 'error').length,
			nLocalFixableWarn = fixable.length - nLocalFixableErr;
		if (quiet) {
			problems = errors;
		} else {
			nWarn += nLocalWarn;
			nFixableWarn += nLocalFixableWarn;
		}
		if (problems.length > 0) {
			console.error(`\n${chalk.underline('%s')}`, file);
			const maxLineChars = String(Math.max(...problems.map(({startLine}) => startLine))).length,
				maxColChars = String(Math.max(...problems.map(({startCol}) => startCol))).length,
				maxMessageChars = Math.max(...problems.map(({message: {length}}) => length));
			for (const {rule, message, severity, startLine, startCol} of problems) {
				console.error(
					`  ${chalk.dim('%s:%s')}  %s  %s  ${chalk.dim('%s')}`,
					String(startLine).padStart(maxLineChars),
					String(startCol).padEnd(maxColChars),
					coloredSeverity(severity),
					message.padEnd(maxMessageChars),
					rule,
				);
			}
		}
		nErr += nLocalErr;
		nFixableErr += nLocalFixableErr;
		exiting ||= Boolean(nLocalErr || strict && nLocalWarn);
	}

	if (nErr || nWarn) {
		console.error(
			chalk.red.bold('%s'),
			`\n✖ ${plural(nErr + nWarn, 'problem')} (${
				plural(nErr, 'error')
			}, ${plural(nWarn, 'warning')})`,
		);
		if (nFixableErr || nFixableWarn) {
			console.error(
				chalk.red.bold('%s'),
				`  ${plural(nFixableErr, 'error')} and ${
					plural(nFixableWarn, 'warning')
				} potentially fixable with the \`--fix\` option.`,
			);
		}
		console.error();
	}

	await Promise.all(jobs);
	if (caching) {
		fs.writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');
	}
	if (exiting) {
		process.exitCode = 1;
	}
})();
