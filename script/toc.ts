import fs from 'fs';
import path from 'path';

const [,, filename] = process.argv;
if (!filename) {
	throw new RangeError('请指定文档文件！');
}
const fullpath = path.resolve('wiki', `${filename}.md`),
	isEnglish = filename.endsWith('-(EN)');
if (!fs.existsSync(fullpath)) {
	throw new RangeError(`文档 ${filename}.md 不存在！`);
}

const content = fs.readFileSync(fullpath, 'utf8');
if (/^- \[[^\]]+\]\(#[^)]+\)$/mu.test(content)) {
	throw new Error(`文档 ${filename}.md 中已包含目录！`);
}

const toc = content.split('\n').filter(line => line.startsWith('#')).map(line => line.replace(
	/^(#+)\s+(\S.*)$/u,
	(_, {length}: string, title: string) => `${'\t'.repeat(length - 1)}- [${title}](#${
		title.toLowerCase().replace(/[ .]/gu, m => m === ' ' ? '-' : '')
	})`,
)).join('\n');

fs.writeFileSync(fullpath, `<details>\n\t<summary>${
	isEnglish ? 'Table of Contents' : '目录'
}</summary>\n\n${toc}\n\n</details>\n\n# Other Languages\n\n- [${
	isEnglish ? '简体中文' : 'English'
}](./${
	isEnglish ? filename.slice(0, -5) : `${filename}-%28EN%29`
})\n\n${content}`);
