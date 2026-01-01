import fs from 'fs';
import path from 'path';
import {info} from '../util/diff';
import Parser from '../index';
import {prepare} from './util';
import type {Test} from '@bhsd/test-util';

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
		'html/php+disabled',
		'html/*',
	]),
	re = /^!!\s*options(?:\n(?:parsoid=(?:[^\s,]+,)?(?:wt2html.*|\{(?:(?!$)[^}]+|$(?:(?!^\}$)[\s\S])+^)\})|(?:(?:subpage )?title|preprocessor|thumbsize)=.+|language=(?:en|zh)(?: .*)?|cat|subpage|showindicators|djvu|showmedia|showtocdata|showflags|extlinks|templates|links|special))*\n!/mu;
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/^(?:\n?(?:(?:parsoid|wgRawHtml)\s*=.+|parsoid|parsoid\s*=\s*\{\n[\s\S]+\n\}|# .*))+$/u;
const optionRegex = new RegExp(String.raw`^(?:\n?(?:(?:${[
		'parsoid',
		'wgRawHtml',
		'maxincludesize',
		'maxtemplatedepth',
		'title',
		'language',
		'userLanguage',
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
		'wgLocaltimezone',
	].join('|')})\s*=.+|${
		[
			'showtitle',
			'msg',
			'cat',
			'ill',
			'iwl',
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
			'extlinks',
			'pmid-interwiki',
			'templates',
			'links',
			'special',
		].join('|')
	}|parsoid\s*=\s*\{\n[\s\S]+\n\}|# .*)|pst )+$`, 'u'),
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
		info('html', new Set(htmlInfo));
	}
	if (optionInfo.length > 0) {
		info('options', new Set(optionInfo));
	}
	for (const [test] of cases) {
		const wikitext = /^!!\s*wikitext\n+((?!!!)[^\n].*?)^!!/msu.exec(test)?.[1]!.trimEnd(),
			option = regex.options.exec(test)?.[1]!.trim() ?? '',
			html = /^!!\s*html(?:\/(?:php|\*))?\n(.*?)^!!/msu.exec(test)?.[1]!.trim();
		if (
			!wikitext
			|| /<(?:div|span|static|aside|embed|seal)?tag\b|\{\{\s*#(?:div|span)tag:/iu.test(wikitext)
			|| /\b(?:NULL\b|array\s*\()/u.test(html!)
			|| /\blanguage=(?!en|zh)/u.test(option)
			|| test.split(/^!!\s*options\n/mu, 3).length > 2
		) {
			continue;
		}
		const desc = /^!!\s*test\n(.*?)\n!!/msu.exec(test)![1]!,
			mt = /\btitle=\s*(?:\[\[([^\]]+)|\\"((?:(?!\\").)+)|(.+))/u.exec(option),
			title = mt?.[1] ?? mt?.[2] ?? mt?.[3],
			root = Parser.parse(wikitext, title ?? 'Parser test'),
			t: Test = {desc, wikitext, title};
		if (/^!!\s*html(?:\/(?:php|\*))?$/mu.test(test) && (!option || re.test(test))) {
			t.html = html!;
			try {
				t.render = root.toHtml();
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
	unused = fs.readdirSync(dir, {withFileTypes: true, recursive: true})
		.filter(dirent => {
			const {name, parentPath} = dirent;
			return dirent.isFile()
				&& !Parser.templates.has(
					decodeURIComponent(path.relative(dir, path.join(parentPath, name.slice(0, -5))))
						.replaceAll('꞉', ':'),
				);
		});
if (unused.length > 0) {
	console.log('Unused templates', unused.sort());
}
