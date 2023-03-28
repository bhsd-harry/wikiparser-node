#!/usr/bin/env node
'use strict';

const {argv: [,, file]} = process;
const fs = require('fs'),
	/** @type {ObjectConstructor} */ Node = require(`.${file[0] === '.' ? '' : './'}${file}`);
const {prototype} = Node,
	{constructor: {name}} = prototype,
	filename = `wiki/${name}.md`,
	properties = [],
	methods = [],
	ignoreMethods = new Set(['constructor', 'getAttribute', 'setAttribute']);

if (fs.existsSync(filename)) {
	throw new RangeError(`文档 ${name}.md 已存在！`);
}

for (const key of Object.getOwnPropertyNames(prototype)) {
	try {
		if (typeof prototype[key] === 'function') {
			if (!ignoreMethods.has(key)) {
				methods.push(key);
			}
			continue;
		}
	} catch {}
	properties.push(key);
}

const details = '\n\n<details>\n\t<summary>展开</summary>\n\n**type**: ``  \n\n```js\n\n```\n</details>\n\n';
let doc = `# ${name} 简介\n\n`,
	instance = false;
for (const line of String(Node).split('\n').slice(1)) {
	if (!line) {
		break;
	} else if (line.at(-1) === ';') {
		const key = line.replace(/\/\*\* [^/]+ \*\/| = [^;]+|;$/gu, '').trim();
		if (key[0] !== '#') {
			if (!instance) {
				doc += `# Instance Properties\n\n`;
				instance = true;
			}
			doc += `## ${key}${details}`;
		}
	}
}
if (properties.length > 0) {
	doc += `# Prototype Properties\n\n${properties.map(key => `## ${key}${details}`).join('')}`;
}
if (methods.length > 0) {
	doc += `# Methods\n\n${methods.map(key => `## ${key}${details}`).join('')}`;
}

fs.writeFileSync(filename, doc);
