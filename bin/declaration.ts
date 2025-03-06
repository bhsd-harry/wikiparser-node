import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const regex = /^declare const \w+_base:(?:.+\) &)? typeof (?:\w+\.)?(\w+)\b.+(export [^\n]+ extends )\w+\b/imsu;

for (const file of fs.readdirSync('dist/src/', {recursive: true}) as string[]) {
	if (!file.endsWith('.d.ts')) {
		continue;
	}
	const fullPath = path.join('dist/src', file),
		content = fs.readFileSync(fullPath, 'utf8');
	if (/^declare const \w+_base: /mu.test(content)) {
		console.log('%s %s', chalk.green('Cleaning declaration:'), file);
		fs.writeFileSync(
			fullPath,
			content.replace(
				regex,
				(_, base: string, exp: string): string => {
					/import \{\s*Token\b.+?;\n/su; // eslint-disable-line @typescript-eslint/no-unused-expressions
					const regex2 = new RegExp(String.raw`import \{\s*${base}\b.+?;\n`, 'su');
					return (
						regex2.test(content)
							? ''
							: regex2.exec(
								fs.readFileSync(
									path.join('src', file.replace(/d\.ts$/u, 'ts')),
									'utf8',
								),
							)![0]
					) + exp + base;
				},
			),
		);
	}
}
