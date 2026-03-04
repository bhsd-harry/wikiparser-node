import * as assert from 'assert';
import Parser from '../index';
import type {SeverityLevel} from '../base';
import type {Token, TableToken} from '../internal';

declare type FullLintConfigValue = [SeverityLevel, Record<string, SeverityLevel>];

const N = 1e4,
	{rules} = Parser.lintConfig,
	[, noDuplicate] = rules['no-duplicate'] as FullLintConfigValue,
	[, noIgnored] = rules['no-ignored'] as FullLintConfigValue;
noDuplicate['attribute'] = 0;
noDuplicate['parameter'] = 0;
noDuplicate['imageParameter'] = 0;
noIgnored['arg'] = 0;

/** @ignore */
const methods = (root: Token): void => {
	root.lint();

	/* NOT FOR BROWSER */

	root.print();
	root.json();
	root.toHtml();
};

/** @ignore */
const basic = (content: string, type: string, n = N, include?: boolean): void => {
	const root = Parser.parse(content, include);
	assert.strictEqual(root.firstChild!.type, type);
	assert.strictEqual(root.length, n);
	methods(root);
};

/** @ignore */
const complex = (
	content: string,
	type: string,
	firstType: string,
	lastType = firstType,
	n = N,
	getter?: 'firstChild' | 'lastChild',
): void => {
	const root = Parser.parse(content),
		first = root.firstChild as Token,
		token = getter ? first[getter] as Token : first;
	assert.strictEqual(first.type, type);
	assert.strictEqual(token.firstChild!.type, firstType);
	assert.strictEqual(token.lastChild!.type, lastType);
	assert.strictEqual(token.length, n);
	methods(root);
};

describe('Performance test', () => {
	it('<translate>', () => {
		const content = '<translate nowrap></translate>'.repeat(N);
		basic(content, 'translate');
	});
	it('<tvar>', () => {
		const content = `<translate>${'<tvar name=1></tvar>'.repeat(N)}</translate>`;
		complex(content, 'translate', 'tvar', undefined, N * 2, 'lastChild');
	});
	it('<onlyinclude>', () => {
		const content = '<onlyinclude></onlyinclude>'.repeat(N);
		basic(content, 'onlyinclude', N, true);
	});
	it('<noinclude>', () => {
		const content = '<noinclude>'.repeat(N);
		basic(content, 'noinclude');
	});
	it('<includeonly>', () => {
		const content = '<includeonly></includeonly>'.repeat(N);
		basic(content, 'include');
	});
	it('comment', () => {
		const content = '<!-- -->'.repeat(N);
		basic(content, 'comment');
	});
	it('extension tag', () => {
		const content = '<pre></pre>'.repeat(N);
		basic(content, 'ext');
	});
	it('self-closing extension tag', () => {
		const content = '<pre/>'.repeat(N);
		basic(content, 'ext');
	});
	it('extension tag attribute', () => {
		const content = `<pre${' id=1'.repeat(N)}/>`;
		complex(content, 'ext', 'ext-attr-dirty', 'ext-attr', N * 2, 'firstChild');
	});
	it('argument', () => {
		const content = '{{{|}}}'.repeat(N);
		basic(content, 'arg');
	});
	it('redundant argument delimiter', () => {
		const content = `{{{${'|'.repeat(N)}}}}`;
		complex(content, 'arg', 'arg-name', 'hidden', N + 1);
	});
	it('magic word', () => {
		const content = '{{#invoke:a|b}}'.repeat(N);
		basic(content, 'magic-word');
	});
	it('template', () => {
		const content = '{{a}}'.repeat(N);
		basic(content, 'template');
	});
	it('anonymous template parameter', () => {
		const content = `{{a${'|'.repeat(N)}}}`;
		complex(content, 'template', 'template-name', 'parameter', N + 1);
	});
	it('named template parameter', () => {
		const content = `{{a${'|1='.repeat(N)}}}`;
		complex(content, 'template', 'template-name', 'parameter', N + 1);
	});
	it('heading', () => {
		const content = Array.from({length: N}, (_, i) => `==${i}==\n`).join('');
		basic(content, 'heading', N * 2);
	});
	it('HTML', () => {
		const content = '<p>'.repeat(N);
		basic(content, 'html');
	});
	it('closing HTML', () => {
		const content = '</p>'.repeat(N);
		basic(content, 'html');
	});
	it('self-closing HTML', () => {
		const content = '<li/>'.repeat(N);
		basic(content, 'html');
	});
	it('void HTML', () => {
		const content = '<br>'.repeat(N);
		basic(content, 'html');
	});
	it('HTML attribute', () => {
		const content = `<p${' id=1'.repeat(N)}>`;
		complex(content, 'html', 'html-attr-dirty', 'html-attr', N * 2, 'firstChild');
	});
	it('table', () => {
		const content = '{|\n|}\n'.repeat(N);
		basic(content, 'table', N * 2);
	});
	it('table row', () => {
		const content = `{|${'\n|-'.repeat(N)}`;
		complex(content, 'table', 'table-syntax', 'tr', N + 2);
	});
	it('table cell in table', () => {
		const content = `{|${'\n|'.repeat(N)}`;
		complex(content, 'table', 'table-syntax', 'td', N + 2);
	});
	it('table cell in table row', () => {
		const content = `{|\n|-${'\n|'.repeat(N)}`,
			table = Parser.parse(content).firstChild as TableToken;
		assert.strictEqual(table.type, 'table');
		assert.strictEqual(table.lastChild.length, N + 2);
	});
	it('table attribute', () => {
		const content = `{|${' id=1'.repeat(N)}`;
		complex(
			content,
			'table',
			'table-attr-dirty',
			'table-attr',
			N * 2,
			'lastChild',
		);
	});
	it('hr', () => {
		const content = '----\n'.repeat(N);
		basic(content, 'hr', N * 2);
	});
	it('double underscore', () => {
		const content = '__TOC__'.repeat(N);
		basic(content, 'double-underscore');
	});
	it('link', () => {
		const content = '[[a]]'.repeat(N);
		basic(content, 'link');
	});
	it('category', () => {
		const content = '[[Category:a]]'.repeat(N);
		basic(content, 'category');
	});
	it('file', () => {
		const content = '[[File:a]]'.repeat(N);
		basic(content, 'file');
	});
	it('gallery image', () => {
		const content = `<gallery>${'a\n'.repeat(N)}</gallery>`;
		complex(content, 'ext', 'gallery-image', 'text', N + 1, 'lastChild');
	});
	it('image caption', () => {
		const content = `[[File:a${'|'.repeat(N)}]]`;
		complex(content, 'file', 'link-target', 'image-parameter', N + 1);
	});
	it('simple image attribute', () => {
		const content = `[[File:a${'|left'.repeat(N)}]]`;
		complex(content, 'file', 'link-target', 'image-parameter', N + 1);
	});
	it('complex image attribute', () => {
		const content = `[[File:a${'|link='.repeat(N)}]]`;
		complex(content, 'file', 'link-target', 'image-parameter', N + 1);
	});
	it('quote', () => {
		const content = "'' ".repeat(N);
		basic(content, 'quote', N * 2);
	});
	it('external link', () => {
		const content = '[http://a a]'.repeat(N);
		basic(content, 'ext-link');
	});
	it('free external link', () => {
		const content = 'http://a '.repeat(N);
		basic(content, 'free-ext-link', N * 2);
	});
	it('magic link', () => {
		const content = 'ISBN 1234567890 '.repeat(N);
		basic(content, 'magic-link', N * 2);
	});
	it('simple list', () => {
		const content = '*\n'.repeat(N);
		basic(content, 'list', N * 2);
	});
	it('definition list', () => {
		const content = ';a:b\n'.repeat(N);
		basic(content, 'list', N * 4);
	});
	it('language conversion', () => {
		const content = '-{}-'.repeat(N);
		basic(content, 'converter');
	});
	it('language conversion flag', () => {
		const content = `-{${'zh-cn;'.repeat(N)}|}-`;
		complex(
			content,
			'converter',
			'converter-flag',
			undefined,
			N + 1,
			'firstChild',
		);
	});
	it('language conversion rule', () => {
		const content = `-{${'zh:a;'.repeat(N)}}-`;
		complex(content, 'converter', 'converter-flags', 'converter-rule', N + 2);
	});
	it('extension parameter line', () => {
		const content = `<inputbox>${'\ntype'.repeat(N)}</inputbox>`;
		complex(content, 'ext', 'param-line', undefined, N + 1, 'lastChild');
	});
	it('imagemap internal link', () => {
		const content = `<imagemap>File:a${'\n1 [[a]]'.repeat(N)}</imagemap>`;
		complex(
			content,
			'ext',
			'imagemap-image',
			'imagemap-link',
			N + 1,
			'lastChild',
		);
	});
	it('imagemap external link', () => {
		const content = `<imagemap>File:a${'\n1 [http://a]'.repeat(N)}</imagemap>`;
		complex(
			content,
			'ext',
			'imagemap-image',
			'imagemap-link',
			N + 1,
			'lastChild',
		);
	});
});
