/* eslint-disable n/no-process-exit */

import {readFileSync, readdirSync, promises} from 'fs';
import {resolve} from 'path';
import * as chalk from 'chalk';
import Parser = require('../index');
import type {LintError} from '../base';

const man = `
Available options:
-c, --config <path or preset config>    Choose parser's configuration
--fix                                   Automatically fix problems
-h, --help                              Print available options
-i, --include                           Parse for inclusion
-l, --lang                              Choose i18n language
-q, --quiet                             Report errors only
-s, --strict                            Exit when there is an error or warning
                                        Override -q or --quiet
-v, --version                           Print package version
`,
	preset = new Set(
		readdirSync('./config').filter(file => file.endsWith('.json'))
			.map(file => file.slice(0, -5)),
	),
	{argv} = process,
	files: string[] = [];
let include = false,
	quiet = false,
	strict = false,
	exit = false,
	fixing = false,
	nErr = 0,
	nWarn = 0,
	nFixableErr = 0,
	nFixableWarn = 0,
	option: string,
	config: string | undefined,
	lang: string | undefined;

/**
 * throw if `-c` or `--config` option is incorrect
 * @throws `Error` unrecognized config input
 */
const throwOnConfig = (): void => {
	if (!config || config.startsWith('-')) {
		throw new Error('The option -c/--config must be followed by a path or a preset config');
	} else if (!config.includes('/') && !preset.has(config)) {
		throw new Error(`Unrecognized preset config: ${config}`);
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
			config = argv[++i];
			throwOnConfig();
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
		case '-l':
		case '--lang':
			lang = argv[++i];
			break;
		case '-q':
		case '--quiet':
			quiet = true;
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
			if (option.startsWith('--config=')) {
				config = option.slice(9);
				throwOnConfig();
				break;
			} else if (option.startsWith('--lang=')) {
				lang = option.slice(7);
				break;
			} else if (option.startsWith('-')) {
				throw new Error(`Unknown wikilint option: ${option}\n${man}`);
			}
			files.push(option);
	}
}
if (files.length === 0) {
	throw new Error('No target file is specified');
} else if (config) {
	Parser.config = config.includes('/') ? resolve(config) : `./config/${config}`;
}
if (lang) {
	Parser.i18n = lang;
}
if (quiet && strict) {
	quiet = false;
	console.error('-s or --strict will override -q or --quiet\n');
}

for (const file of files) {
	let wikitext = readFileSync(file, 'utf8'),
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
		void promises.writeFile(file, wikitext);
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
		console.error(`\n${chalk.underline('%s')}`, resolve(file));
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
	exit ||= Boolean(nLocalErr || strict && nLocalWarn);
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
if (exit) {
	process.exitCode = 1;
}
