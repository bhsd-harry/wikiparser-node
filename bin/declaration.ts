import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @stylistic/max-len
const regex = /declare [^\n]+?: \(+abstract new [^\n]+\n(.+)\}\) & typeof (\w+\.)?(\w+)\b.+(export [^\n]+ extends )\w+\b(.+?\n)/isu;

for (const file of fs.readdirSync('dist/src/', {recursive: true}) as string[]) {
	if (!file.endsWith('.d.ts')) {
		continue;
	}
	const fullPath = path.join('dist/src', file),
		content = fs.readFileSync(fullPath, 'utf8');
	if (content.includes('(abstract new ')) {
		// console.log(file);
		fs.writeFileSync(
			fullPath,
			content.replace(
				regex,
				(_, mixins: string, parser: string | undefined, base: string, exp: string, impl: string): string => {
					const str = `${exp}${base}${impl}${
							mixins.split(/\n\}\) & \(+abstract new .+/u)
								.map(mixin => mixin.slice(0, mixin.lastIndexOf('readonly'))
									.replace(/^[ \t]+(?:$|readonly .+\n)/gmu, ''))
								.join('\n')
						}`,
						regex2 = new RegExp(`import \\{\\s*${base}\\b.+?;\n`, 'su');
					let imports = '';
					if (parser && !regex2.test(content)) {
						const original = fs.readFileSync(path.join('src', file.replace(/d\.ts$/u, 'ts')), 'utf8');
						[imports] = regex2.exec(original)!;
					}
					return imports + str;
				},
			),
		);
	}
}
