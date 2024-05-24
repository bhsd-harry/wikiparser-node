/* eslint-disable es-x/no-string-prototype-matchall */
import * as fs from 'fs';
import * as path from 'path';
import {info} from '../util/diff';
import Parser from '../index';

Parser.viewOnly = true;
Parser.debugging = true;

const tests: {desc: string, wikitext?: string, html?: string, print?: string}[] = [],
	files = new Set(fs.readdirSync('test/core/'));
files.delete('parserTests.txt');
for (const file of ['parserTests.txt', ...files]) {
	tests.push({desc: file.slice(0, -4)});
	const content = fs.readFileSync(path.join('test/core', file), 'utf8'),
		cases = [...content.matchAll(/^!!\s*test\n.+?^!!\s*end$/gmsu)],
		regex = {
			html: /^!!\s*(html\b.*)$/mu,
			options: /^!!\s*options\n(.*?)^!!/msu,
		},
		modes = new Set([
			'html',
			'html/php',
			'html/parsoid',
			'html/parsoid+integrated',
			'html/php+disabled',
			'html/*',
		]),
		// eslint-disable-next-line @stylistic/max-len
		re = /^!!\s*options(?:\n(?:parsoid=wt2html.*|(?:(?:subpage )?title|preprocessor|thumbsize)=.+|cat|subpage|showindicators|djvu))*\n!/mu,
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
			'preprocessor',
			'wgAllowExternalImages',
			'externallinktarget',
			'thumbsize',
			'wgEnableUploads',
			'wgEnableMagicLinks',
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
				'showindicators',
				'djvu',
				'lastsavedrevision',
				'showflags',
			].join('|')
		}|parsoid\\s*=\\s*\\{\\n[\\s\\S]+\\n\\}|# .*))+$`, 'u'),
		htmlInfo = cases.map(([test]) => regex.html.exec(test)?.[1]).filter(x => x && !modes.has(x)),
		optionInfo = cases.map(([test]) => regex.options.exec(test)?.[1]!.trim())
			.filter(x => x && !optionRegex.test(x));
	if (htmlInfo.length > 0) {
		info('html', new Set(htmlInfo));
	}
	if (optionInfo.length > 0) {
		info('options', new Set(optionInfo));
	}
	for (const [test] of cases) {
		if (
			/^!!\s*html(?:\/(?:php|\*))?$/mu.test(test)
			&& (!test.includes('options') || re.test(test))
		) {
			try {
				const wikitext = /^!!\s*wikitext\n+((?!!!)[^\n].*?)^!!/msu.exec(test)?.[1]!.trimEnd(),
					html = /^!!\s*html(?:\/(?:php|\*))?\n(.*?)^!!/msu.exec(test)![1]!.trim(),
					desc = /^!!\s*test\n(.*?)\n!!/msu.exec(test)![1]!;
				if (wikitext) {
					tests.push({desc, wikitext, html, print: Parser.parse(wikitext).print()});
				}
			} catch {
				console.error(test);
			}
		}
	}
}
fs.writeFileSync('test/parserTests.json', JSON.stringify(tests, null, '\t'));
