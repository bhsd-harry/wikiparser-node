import * as fs from 'fs';

const {argv: [,, filename]} = process;
if (!filename) {
	throw new RangeError('请指定文档文件！');
} else if (!fs.existsSync(filename)) {
	throw new RangeError(`文档 ${filename} 不存在！`);
}

const content = fs.readFileSync(filename, 'utf8');
if (/^- \[[^\]]+\]\(#[^)]+\)$/mu.test(content)) {
	throw new Error(`文档 ${filename} 中已包含目录！`);
}

const toc = content.split('\n').filter(line => line.startsWith('#')).map(line => line.replace(
	/^(#+)\s+(\S.*)$/u,
	(_, {length}: string, title: string) => `${'\t'.repeat(length - 1)}- [${title}](#${
		title.toLowerCase().replaceAll(' ', '-').replaceAll('.', '')
	})`,
)).join('\n');

fs.writeFileSync(filename, `<details>\n\t<summary>目录</summary>\n\n${toc}\n</details>\n\n${content}`);
