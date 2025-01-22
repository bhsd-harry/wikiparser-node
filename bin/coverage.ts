import * as fs from 'fs';

declare interface Summary {
	total: number;
	covered: number;
	skipped: number;
	pct: number;
}
declare interface Coverage {
	total: {
		lines: Summary;
		functions: Summary;
		statements: Summary;
		branches: Summary;
	};
}

// eslint-disable-next-line n/no-missing-require
const {total: {statements: {pct}}}: Coverage = require('../../coverage/coverage-summary.json');
const svg = fs.readFileSync('coverage/badge.svg', 'utf8').replace(/\b\d{2}(?=%)/gu, String(Math.round(pct)));
fs.writeFileSync('coverage/badge.svg', svg);
