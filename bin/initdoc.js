#!/usr/bin/env node
'use strict';

const {argv: [,, file]} = process;
const fs = require('fs'),
	/** @type {ObjectConstructor} */ Node = require(`.${file[0] === '.' ? '' : './'}${file}`);
const {prototype} = Node,
	{constructor: {name}} = prototype,
	lines = String(Node).split('\n').slice(1),
	properties = [],
	methods = [];

for (const key of Object.getOwnPropertyNames(prototype)) {
	try {
		if (typeof prototype[key] === 'function') {
			methods.push(key);
			continue;
		}
	} catch {}
	properties.push(key);
}

let doc = `# ${name}\n\n`,
	instance = false;
for (const line of lines) {
	if (!line) {
		break;
	} else if (line.at(-1) === ';') {
		const key = line.replace(/\/\*\* [^/]+ \*\/| = [^;]+|;$/gu, '').trim();
		if (key[0] !== '#') {
			if (!instance) {
				doc += `## Instance Properties\n\n`;
				instance = true;
			}
			doc += `### ${
				key
			}\n\n<details>\n\t<summary>展开</summary>\n\n**type**:\n\n\`\`\`js\n\n\`\`\`\n</details>\n\n`;
		}
	}
}
if (properties.length > 0) {
	doc += `## Prototype Properties\n\n${properties.map(
		key => `### ${key}\n\n<details>\n\t<summary>展开</summary>\n\n**type**:\n\n\`\`\`js\n\n\`\`\`\n</details>\n\n`,
	).join('')}`;
}
if (methods.length > 0) {
	doc += `## Prototype Methods\n\n${methods.map(
		key => `### ${key}\n\n<details>\n\t<summary>展开</summary>\n\n**type**:\n\n\`\`\`js\n\n\`\`\`\n</details>\n\n`,
	).join('')}`;
}

fs.writeFileSync(`wiki/${name}.md`, doc);
