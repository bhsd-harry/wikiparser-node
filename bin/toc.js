'use strict';

const {argv: [,, filename]} = process;
const fs = require('fs');

if (!fs.existsSync(filename)) {
	throw new RangeError(`文档 ${filename} 不存在！`);
}

const content = fs.readFileSync(filename, 'utf8');
if (/^- \[[^\]]+\]\(#[^)]+\)$/mu.test(content)) {
	throw new Error(`文档 ${filename} 中已包含目录！`);
}

const toc = content.split('\n').filter(line => line.startsWith('#')).map(line => line.replace(
	/^(#+)\s+(\S.*)$/u,
	/** @type {function(...string): string} */
	(_, level, title) => `${'\t'.repeat(level.length - 1)}- [${title}](#${
		title.toLowerCase().replaceAll(' ', '-').replaceAll('.', '')
	})`,
)).join('\n');
fs.writeFileSync(filename, `<details>\n\t<summary>目录</summary>\n\n${toc}\n</details>\n\n${content}`);
