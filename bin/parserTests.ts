/* eslint-disable es-x/no-string-prototype-matchall, es-x/no-regexp-lookbehind-assertions */
import * as fs from 'fs';
import {info} from '../util/diff';
import Parser from '../index';

Parser.debugging = true;

const content = fs.readFileSync('test/parserTests.txt', 'utf8'),
	cases = [...content.matchAll(/^!!\s*test\n.+?^!!\s*end$/gmsu)],
	tests = [],
	regex = {
		html: /^!!\s*(html\b.*)$/mu,
		options: /^!!\s*options\n(.*?)^!!/msu,
	},
	optionRegex = new RegExp(`^(?:\\n?(?:(?:${[
		'parsoid',
		'wgRawHtml',
		'maxincludesize',
		'maxtemplatedepth',
		'title',
		'language',
		'subpage title',
		'wgNonincludableNamespaces',
		'section',
		'replace',
		'comment title',
		'comment local title',
		'wgLinkHolderBatchSize',
		'styletag',
	].join('|')})\\s*=.+|${
		[
			'showtitle',
			'msg',
			'cat',
			'ill',
			'comment',
			'subpage',
			'disabled',
			'parsoid',
			'preload',
			'local',
		].join('|')
	}|parsoid=\\s*\\{\\n[\\s\\S]+\\n\\}))+$`, 'u');
info('html', new Set(cases.map(([test]) => regex.html.exec(test)?.[1]).filter(Boolean)));
info(
	'options',
	new Set(cases.map(([test]) => regex.options.exec(test)?.[1]!.trim()).filter(x => x && !optionRegex.test(x))),
);
for (const [test] of cases) {
	if (
		/^!!\s*html(?:\/(?:php|\*))?$/mu.test(test)
		&& (
			!test.includes('options')
			|| /^!!\s*options(?:\n(?:parsoid=wt2html.*|(?:subpage )?title=.+|cat|ill|subpage))*\n!/mu.test(test)
		)
	) {
		try {
			const wikitext = /(?<=^!!\s*wikitext\n).*?(?=^!!)/msu.exec(test)![0].trim(),
				html = /(?<=^!!\s*html(?:\/(?:php|\*))?\n).*?(?=^!!)/msu.exec(test)![0].trim(),
				[desc] = /(?<=^!!\s*test\n).*?(?=\n!!)/msu.exec(test)!;
			tests.push({desc, wikitext, html, print: Parser.parse(wikitext).print()});
		} catch {
			console.error(test);
		}
	}
}
fs.writeFileSync('test/parserTests.json', JSON.stringify(tests, null, '\t'));
