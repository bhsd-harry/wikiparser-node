import * as fs from 'fs';
import * as path from 'path';

for (const file of fs.readdirSync('dist/src/', {recursive: true}) as string[]) {
	if (!file.endsWith('.d.ts')) {
		continue;
	}
	const fullPath = path.join('dist/src', file),
		content = fs.readFileSync(fullPath, 'utf8'),
		mt = /^\}\) & typeof (?:parser\.)?(\w*token);$/imu.exec(content);
	if (mt) {
		// console.log(file);
		fs.writeFileSync(fullPath, content.replace(/^(export declare class \w+token extends )\w+/imu, `$1${mt[1]}`));
	}
}
