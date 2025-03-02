/* eslint-disable n/no-process-exit */

import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import {minimatch} from 'minimatch';
import Parser from '../index';
import type {LintError} from '../base';

const man = `
Available options:
-c, --config <path or preset config>    Choose parser's configuration
--ext <extension>                       Specify file extension
--fix                                   Automatically fix problems
-h, --help                              Print available options
-i, --include                           Parse for inclusion
--ignore <pattern>                      Ignore files that match the pattern
-l, --lang <path or preset language>    Choose i18n language
-q, --quiet                             Report errors only
-r, --recursive                         Lint files in directories recursively
-s, --strict                            Exit when there is an error or warning
                                        Override -q or --quiet
-v, --version                           Print package version
`,
	preset = new Set(
		fs.readdirSync('./config').filter(file => file.endsWith('.json'))
			.map(file => file.slice(0, -5)),
	),
	i18n = new Set(
		fs.readdirSync('./i18n').filter(file => file.endsWith('.json'))
			.map(file => file.slice(0, -5)),
	),
	{argv} = process,
	exts: string[] = [],
	ignorePatterns: string[] = [],
	jobs: Promise<void>[] = [];
let files: string[] = [],
	exiting = false,
	fixing = false,
	include = false,
	quiet = false,
	recursive = false,
	strict = false,
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
		default:
			if (option.includes('=')) {
				const j = option.indexOf('='),
					value = option.slice(j + 1);
				switch (option.slice(0, j)) {
					case '--config':
						throwOnConfig(value);
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
					// no default
				}
			}
			if (option.startsWith('-')) {
				exit(`Unknown wikilint option: ${option}\n${man}`);
			}
			files.push(option);
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

for (const file of new Set(files.map(f => path.resolve(f)))) {
	if (fs.statSync(file).isDirectory()) {
		console.error(`"${file}" is a directory. Please use -r or --recursive to lint directories.`);
		exiting = true;
		continue;
	} else if (ignorePatterns.some(ignore => minimatch(file, ignore))) {
		continue;
	}
	let wikitext = fs.readFileSync(file, 'utf8'),
		problems = Parser.parse(wikitext, include).lint();
	if (fixing && problems.some(({fix}) => fix)) {
		// 倒序修复，跳过嵌套的修复
		const fixable = (problems.map(({fix}) => fix).filter(Boolean) as LintError.Fix[])
			.sort(({range: [aFrom, aTo]}, {range: [bFrom, bTo]}) => aTo === bTo ? bFrom - aFrom : bTo - aTo);
		let start = Infinity;
		for (const {range: [from, to], text} of fixable) {
			if (to <= start) {
				wikitext = wikitext.slice(0, from) + text + wikitext.slice(to);
				start = from;
			}
		}
		jobs.push(fs.promises.writeFile(file, wikitext));
		problems = Parser.parse(wikitext, include).lint();
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

(async () => {
	await Promise.all(jobs);
	if (exiting) {
		process.exitCode = 1;
	}
})();
