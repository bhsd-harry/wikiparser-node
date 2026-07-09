import fs from 'fs';
import path from 'path';
import {info} from '../util/diff';
import Parser from '../index';
import {prepare} from './util';
import type {Test} from '@bhsd/test-util/parser';

prepare(Parser);
Parser.internal = true;

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
		'html/parsoid+langconv',
		'html/php+disabled',
		'html/*',
	]),
	re = new RegExp(
		String.raw`^!!\s*options(?:\n(?:parsoid\s*=\s*(?:[^\s,]+,)?(?:${[
			'wt2html.*',
			String.raw`\{(?:(?!$)[^}]+|$(?:(?!^\}$)[\s\S])+^)\}`,
		].join('|')})|(?:${[
			'preprocessor',
			'property',
			'subpage title',
			'thumbsize',
			'title',
			'userLanguage',
		].join('|')})\s*=.+|language\s*=\s*(?:en|zh)(?: .*)?|${[
			'cat',
			'extlinks',
			'links',
			'showflags',
			'showindexpolicy',
			'showindicators',
			'showmedia',
			'showtitle',
			'showtocdata',
			'special',
			'subpage',
			'templates',
		].join('|')}))*\n!`,
		'mu',
	);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(?:\n?(?:parsoid\s*=\s*\{\n[\s\S]+\n\}|(?:parsoid|wgRawHtml)\s*=.+|parsoid|# .*|pst ))+$/u;
const optionRegex = new RegExp(String.raw`^(?:\n?(?:parsoid\s*=\s*\{\n[\s\S]+\n\}|(?:${[
		'comment local title',
		'comment title',
		'extension',
		'externallinktarget',
		'htmlVariantLanguage',
		'language',
		'maxincludesize',
		'maxtemplatedepth',
		'parsoid',
		'preprocessor',
		'property',
		'replace',
		'section',
		'styletag',
		'subpage title',
		'thumbsize',
		'title',
		'userLanguage',
		'wgAllowExternalImages',
		'wgEnableMagicLinks',
		'wgEnableUploads',
		'wgLinkHolderBatchSize',
		'wgLocaltimezone',
		'wgMaxTocLevel',
		'wgNonincludableNamespaces',
		'wgParserEnableLegacyHeadingDOM',
		'wgRawHtml',
	].join('|')})\s*=.+|${[
		'cat',
		'comment',
		'disabled',
		'djvu',
		'extlinks',
		'ill',
		'iwl',
		'lastsavedrevision',
		'links',
		'local',
		'msg',
		'nohtml',
		'notoc',
		'parsoid',
		'pmid-interwiki',
		'preload',
		'pst',
		'showflags',
		'showindexpolicy',
		'showindicators',
		'showmedia',
		'showtitle',
		'showtocdata',
		'special',
		'subpage',
		'templates',
	].join('|')}|# .*)|pst )+$`, 'u'),
	files = new Set(fs.readdirSync('test/core/'));
files.delete('ThirdPartyNotices');
files.delete('parserTests.txt');
for (const file of ['parserTests.txt', ...files]) {
	tests.push({desc: file.slice(0, -4)});
	const content = fs.readFileSync(path.join('test', 'core', file), 'utf8'),
		cases = [...content.matchAll(/^!!\s*test\n.+?^!!\s*end$/gmsu)],
		htmlInfo = cases.map(([test]) => regex.html.exec(test)?.[1]).filter(x => x && !modes.has(x)),
		optionInfo = cases.map(([test]) => regex.options.exec(test)?.[1]!.trim())
			.filter(x => x && !optionRegex.test(x));
	if (htmlInfo.length > 0) {
		info('html');
		console.info(new Set(htmlInfo));
	}
	if (optionInfo.length > 0) {
		info('options');
		console.info(new Set(optionInfo));
	}
	for (const [test] of cases) {
		const wikitext = /^!!\s*wikitext\n+((?!!!)[^\n].*?)^!!/msu.exec(test)?.[1]!.trimEnd(),
			option = regex.options.exec(test)?.[1]!.trim() ?? '',
			html = /^!!\s*html(?:\/(?:php|\*))?\n(.*?)^!!/msu.exec(test)?.[1]!.trim();
		if (
			!wikitext
			|| /<(?:div|span|static|aside|embed|seal)?tag\b|\{\{\s*#(?:div|span)tag:/iu.test(wikitext)
			|| /\b(?:NULL\b|array\s*\()/u.test(html!)
			|| /\blanguage\s*=\s*(?!en|zh)/u.test(option)
			|| test.split(/^!!\s*options\n/mu, 3).length > 2
		) {
			continue;
		}
		const desc = /^!!\s*test\n(.*?)\n!!/msu.exec(test)![1]!,
			mt = /\btitle\s*=\s*(?:\[\[([^\]]+)|\\"((?:(?!\\").)+)|(.+))/u.exec(option),
			title = mt?.[1] ?? mt?.[2] ?? mt?.[3],
			root = Parser.parse(wikitext, title ?? 'Parser test'),
			t: Test = {desc, wikitext, title};
		if (/^!!\s*html(?:\/(?:php|\*))?$/mu.test(test) && (!option || re.test(test))) {
			t.html = html!;
			try {
				t.render = root.toHtml()
					.replace(/\n<div id="catlinks" class="catlinks">.+$/su, '');
			} catch {
				console.error(`${test}\n`);
			}
		}
		t.print = root.print();
		tests.push(t);
	}
}
fs.writeFileSync('test/parserTests.json', JSON.stringify(tests, null, '\t'));

const dir = 'test/templates',
	unused = fs.globSync('test/templates/**/*.wiki')
		.map(
			name => decodeURIComponent(path.relative(dir, name.slice(0, -5)))
				.replaceAll('꞉', ':'),
		)
		.filter(name => !Parser.templates.has(name));
if (unused.length > 0) {
	console.log('Unused templates');
	console.log(unused.toSorted());
}
