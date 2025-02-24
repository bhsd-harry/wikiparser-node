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
const colors = ['#4c1', '#dfb317', '#e05d44'] as const;
const re = new RegExp(colors.join('|'), 'u');
let color: string;
if (pct >= 80) {
	[color] = colors;
} else if (pct >= 60) {
	[, color] = colors;
} else {
	[,, color] = colors;
}
const svg = fs.readFileSync('coverage/badge.svg', 'utf8')
	.replace(/\b\d{2}(?=%)/gu, String(Math.round(pct)))
	.replace(re, color);
fs.writeFileSync('coverage/badge.svg', svg);
