/* eslint-disable es-x/no-string-prototype-matchall, es-x/no-regexp-lookbehind-assertions */
import * as fs from 'fs';
import Parser from '../index';

const content = fs.readFileSync('test/parserTests.txt', 'utf8'),
	tests = [];
for (const [test] of content.matchAll(/^!! test\n.+?^!! end$/gmsu)) {
	if (/^!! html(?:\/php)?$/mu.test(test) && (!test.includes('options') || /^!! options\n+!/mu.test(test))) {
		try {
			const [wikitext] = /(?<=^!! wikitext\n).*?(?=\n!! [a-z/]+$)/msu.exec(test)!,
				[html] = /(?<=^!! html(?:\/php)?\n).*?(?=\n!! [a-z/]+$)/msu.exec(test)!;
			tests.push({wikitext, html, print: Parser.parse(wikitext).print()});
		} catch {}
	}
}
fs.writeFileSync('test/parserTests.json', JSON.stringify(tests, null, '\t'));
