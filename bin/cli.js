#!/usr/bin/env node
/* eslint-disable n/no-process-exit */

'use strict';

const fs = require('fs'),
	path = require('path'),
	Parser = require('..');
const man = `
Available options:
-c, --config <path or preset config>    Choose parser's configuration
-h, --help                              Print available options
-i, --include                           Parse for inclusion
-q, --quiet                             Report errors only
-s, --strict                            Exit 1 when there is an error or warning
                                        Override -q or --quiet
-v, --version                           Print package version
`,
	preset = new Set(['default', 'zhwiki', 'moegirl', 'llwiki']),
	{argv} = process,
	files = [];
let option = '',
	config = '',
	include = false,
	quiet = false,
	strict = false,
	exit = false,
	nErr = 0,
	nWarn = 0;

/** throw if `-c` or `--config` option is incorrect */
const throwOnConfig = () => {
		if (!config || config[0] === '-') {
			console.error(`The option ${option} must be followed by a path or a preset config`);
			process.exit(1);
		} else if (!config.includes('/') && !preset.has(config)) {
			console.error(`Unrecognized preset config: ${config}`);
			process.exit(1);
		}
	},

	/**
	 * generate plural form if necessary
	 * @param {number} n number of items
	 * @param {string} word item name
	 */
	plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`,

	/**
	 * color the severity
	 * @param {'error'|'warning'} severity problem severity
	 */
	coloredSeverity = severity => `\x1B[${severity === 'error' ? 31 : 33}m${severity}\x1B[0m`.padEnd(16);

for (let i = 2; i < argv.length; i++) {
	option = argv[i];
	switch (option) {
		case '-c':
		case '--config':
			config = option[++i];
			throwOnConfig();
			break;
		case '-h':
		case '--help':
			console.log(man);
			return;
		case '-i':
		case '--include':
			include = true;
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
			const {version} = require('../package');
			console.log(`wikilint v${version}`);
			return;
		}
		default:
			if (option.startsWith('--config=')) {
				config = option.slice(9);
				throwOnConfig();
				break;
			} else if (option[0] === '-') {
				console.error(`Unknown wikilint option: ${option}\n${man}`);
				process.exit(1);
			}
			files.push(option);
	}
}
if (files.length === 0) {
	console.error('No target file is specified');
	process.exit(1);
} else if (config) {
	Parser.config = config.includes('/') ? path.resolve(config) : `./config/${config}`;
}
if (quiet && strict) {
	quiet = false;
	console.error('-s or --strict will override -q or --quiet\n');
}

for (const file of files) {
	const wikitext = fs.readFileSync(file, 'utf8');
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
		console.error('\x1B[4m%s\x1B[0m', path.resolve(file));
		const {length: maxLineChars} = String(Math.max(...problems.map(({startLine}) => startLine))),
			{length: maxColChars} = String(Math.max(...problems.map(({startCol}) => startCol)));
		for (const {message, severity, startLine, startCol} of problems) {
			console.error(
				`  ${String(startLine).padStart(maxLineChars)}:${String(startCol).padEnd(maxColChars)}  ${
					coloredSeverity(severity)
				}  ${message}`,
			);
		}
		console.error();
	}
	nErr += nLocalErr;
	exit ||= nLocalErr || strict && nLocalWarn;
}
if (nErr || nWarn) {
	console.error(
		'\x1B[1;31m%s\x1B[0m\n',
		`✖ ${plural(nErr + nWarn, 'problem')} (${plural(nErr, 'error')}, ${plural(nWarn, 'warning')})`,
	);
}
if (exit) {
	process.exitCode = 1;
}
