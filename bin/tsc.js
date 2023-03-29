'use strict';

const fs = require('fs');
const imports = [];

/** @param {string} path 文件路径 */
const push = path => {
	if (path.endsWith('.js')) {
		const /** @type {ObjectConstructor} */ {name} = require(`../${path}`);
		imports.push([name, `./${path}`]);
	} else {
		for (const file of fs.readdirSync(path)) {
			push(`${path}/${file}`);
		}
	}
};

push('lib');
push('src');

const type = fs.readFileSync('dist/index.d.ts', 'utf8');
fs.writeFileSync('dist/index.d.ts', `${
	imports.map(([name, path]) => `import ${name} = require("${path}")`).join('\n')
}\n\n${type}\ndeclare namespace Parser {\n\texport {\n${
	imports.map(([name]) => `\t\t${name},`).join('\n')
}\n\t}\n}`);
