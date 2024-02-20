/* eslint-disable n/no-process-exit */

import {readFileSync} from 'fs';
import {resolve} from 'path';
import * as chalk from 'chalk';
import Parser = require('../index');
const man = `
Available options:
-c, --config <path or preset config>    Choose parser's configuration
-h, --help                              Print available options
-i, --include                           Parse for inclusion
-l, --lang                              Choose i18n language
-q, --quiet                             Report errors only
-s, --strict                            Exit when there is an error or warning
                                        Override -q or --quiet
-v, --version                           Print package version
`,
	preset = new Set(['default', 'zhwiki', 'moegirl', 'llwiki']),
	{argv} = process,
	files: string[] = [];
let include = false,
	quiet = false,
	strict = false,
	exit = false,
	nErr = 0,
	nWarn = 0,
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
const plural = (n: number, word: string): string => `${n} ${word}${n > 1 ? 's' : ''}`;

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
	const wikitext = readFileSync(file, 'utf8');
	let problems = Parser.parse(wikitext, include).lint();
	const errors = problems.filter(({severity}) => severity === 'error'),
		{length: nLocalErr} = errors,
		nLocalWarn = problems.length - nLocalErr;
	if (quiet) {
		problems = errors;
	} else {
		nWarn += nLocalWarn;
	}
	if (problems.length > 0) {
		console.error(chalk.underline('%s'), resolve(file));
		const {length: maxLineChars} = String(Math.max(...problems.map(({startLine}) => startLine))),
			{length: maxColChars} = String(Math.max(...problems.map(({startCol}) => startCol))),
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
		console.error();
	}
	nErr += nLocalErr;
	exit ||= Boolean(nLocalErr || strict && nLocalWarn);
}
if (nErr || nWarn) {
	console.error(
		`${chalk.red.bold('%s')}\n`,
		`✖ ${plural(nErr + nWarn, 'problem')} (${plural(nErr, 'error')}, ${plural(nWarn, 'warning')})`,
	);
}
if (exit) {
	process.exitCode = 1;
}
