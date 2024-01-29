import * as fs from 'fs';
import * as path from 'path';

const regex = /^declare const \w+_base:(?:.+\) &)? typeof (?:\w+\.)?(\w+)\b.+(export [^\n]+ extends )\w+\b/imsu;

for (const file of fs.readdirSync('dist/src/', {recursive: true}) as string[]) {
	if (!file.endsWith('.d.ts')) {
		continue;
	}
	const fullPath = path.join('dist/src', file),
		content = fs.readFileSync(fullPath, 'utf8');
	if (/^declare const \w+_base: /mu.test(content)) {
		console.log('\x1B[32mCleaning declaration:\x1B[0m %s', file);
		fs.writeFileSync(
			fullPath,
			content.replace(
				regex,
				(_, base: string, exp: string): string => {
					const regex2 = new RegExp(`import \\{\\s*${base}\\b.+?;\n`, 'su');
					if (regex2.test(content)) {
						return exp + base;
					}
					const original = fs.readFileSync(path.join('src', file.replace(/d\.ts$/u, 'ts')), 'utf8');
					return regex2.exec(original)![0] + exp + base;
				},
			),
		);
	}
}