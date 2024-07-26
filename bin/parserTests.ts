import * as fs from 'fs';
import * as path from 'path';
import {info} from '../util/diff';
import Parser from '../index';

declare interface Test {
	desc: string;
	wikitext?: string;
	html?: string;
	print?: string;
	render?: string;
}

const redirects: Record<string, string> = {
	'File:Redirect_to_foobar.jpg': 'File:Foobar.jpg',
	'Template:Redirect_to_foo': 'Template:Foo',
	'Template:Templateredirect': 'Template:Templatesimple',
};

Parser.viewOnly = true;
Parser.debugging = true;
Parser.warning = false;
Parser.templateDir = './test/templates';
for (const [name, target] of Object.entries(redirects)) {
	Parser.redirects.set(name, target);
}

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(?:\n?(?:(?:parsoid|wgRawHtml)\s*=.+|parsoid|parsoid\s*=\s*\{\n[\s\S]+\n\}|# .*))+$/u;
const tests: Test[] = [],
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
	re = /^!!\s*options(?:\n(?:parsoid=wt2html.*|(?:(?:subpage )?title|preprocessor|thumbsize)=.+|language=(?:en|zh) .*|cat|subpage|showindicators|djvu|showmedia|showtocdata))*\n!/mu,
	optionRegex = new RegExp(String.raw`^(?:\n?(?:(?:${[
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
		'wgMaxTocLevel',
		'wgParserEnableLegacyHeadingDOM',
		'extension',
	].join('|')})\s*=.+|${
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
			'nohtml',
			'showtocdata',
			'showmedia',
			'notoc',
			'pst',
		].join('|')
	}|parsoid\s*=\s*\{\n[\s\S]+\n\}|# .*)|pst )+$`, 'u'),
	files = new Set(fs.readdirSync('test/core/'));
files.delete('parserTests.txt');
for (const file of ['parserTests.txt', ...files]) {
	tests.push({desc: file.slice(0, -4)});
	const content = fs.readFileSync(path.join('test', 'core', file), 'utf8'),
		cases = [...content.matchAll(/^!!\s*test\n.+?^!!\s*end$/gmsu)],
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
		const wikitext = /^!!\s*wikitext\n+((?!!!)[^\n].*?)^!!/msu.exec(test)?.[1]!.trimEnd(),
			option = regex.options.exec(test)?.[1]!.trim(),
			html = /^!!\s*html(?:\/(?:php|\*))?\n(.*?)^!!/msu.exec(test)?.[1]!.trim();
		if (
			!wikitext
			|| /<(?:span|static|aside)?tag\b/iu.test(wikitext)
			|| /\b(?:NULL\b|array\s*\()/u.test(html!)
			|| /\blanguage=(?!en|zh)/u.test(option!)
		) {
			continue;
		}
		const desc = /^!!\s*test\n(.*?)\n!!/msu.exec(test)![1]!,
			root = Parser.parse(wikitext),
			t: Test = {desc, wikitext};
		if (/^!!\s*html(?:\/(?:php|\*))?$/mu.test(test) && (!test.includes('options') || re.test(test))) {
			t.html = html!;
			try {
				t.render = root.toHtml();
			} catch {
				console.error(test);
			}
		}
		t.print = root.print();
		tests.push(t);
	}
}
fs.writeFileSync('test/parserTests.json', JSON.stringify(tests, null, '\t'));
console.log([...Parser.templates.keys()].sort());
