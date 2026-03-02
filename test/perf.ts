import * as assert from 'assert';
import Parser from '../index';
import type {Token, TableToken} from '../internal';

const N = 1e4;

/** @ignore */
const basic = (content: string, n = N): void => {
	const root = Parser.parse(content);
	assert.strictEqual(root.length, n);
};

/** @ignore */
const complex = (content: string, type: string, n = N, getter?: 'firstChild' | 'lastChild'): void => {
	const first = Parser.parse(content).firstChild as Token,
		token = getter ? first[getter] as Token : first;
	assert.strictEqual(first.type, type);
	assert.strictEqual(token.length, n);
};

describe('Performance test', () => {
	it('<translate>', () => {
		const content = '<translate nowrap></translate>'.repeat(N);
		basic(content);
	});
	it('<tvar>', () => {
		const content = `<translate>${'<tvar name=1></tvar>'.repeat(N)}</translate>`;
		complex(content, 'translate', N * 2, 'lastChild');
	});
	it('<onlyinclude>', () => {
		const content = '<onlyinclude></onlyinclude>'.repeat(N);
		basic(content, N * 2);
	});
	it('<noinclude>', () => {
		const content = '<noinclude>'.repeat(N);
		basic(content);
	});
	it('<includeonly>', () => {
		const content = '<includeonly></includeonly>'.repeat(N);
		basic(content);
	});
	it('comment', () => {
		const content = '<!-- -->'.repeat(N);
		basic(content);
	});
	it('extension tag', () => {
		const content = '<pre></pre>'.repeat(N);
		basic(content);
	});
	it('self-closing extension tag', () => {
		const content = '<pre/>'.repeat(N);
		basic(content);
	});
	it('extension tag attribute', () => {
		const content = `<pre${' id=1'.repeat(N)}/>`;
		complex(content, 'ext', N * 2, 'firstChild');
	});
	it('argument', () => {
		const content = '{{{|}}}'.repeat(N);
		basic(content);
	});
	it('redundant argument delimiter', () => {
		const content = `{{{${'|'.repeat(N)}}}}`;
		complex(content, 'arg', N + 1);
	});
	it('magic word', () => {
		const content = '{{#invoke:a|b}}'.repeat(N);
		basic(content);
	});
	it('template', () => {
		const content = '{{a}}'.repeat(N);
		basic(content);
	});
	it('anonymous template parameter', () => {
		const content = `{{a${'|'.repeat(N)}}}`;
		complex(content, 'template', N + 1);
	});
	it('named template parameter', () => {
		const content = `{{a${'|1='.repeat(N)}}}`;
		complex(content, 'template', N + 1);
	});
	it('heading', () => {
		const content = '=a=\n'.repeat(N);
		basic(content, N * 2);
	});
	it('HTML', () => {
		const content = '<p>'.repeat(N);
		basic(content);
	});
	it('closing HTML', () => {
		const content = '</p>'.repeat(N);
		basic(content);
	});
	it('self-closing HTML', () => {
		const content = '<li/>'.repeat(N);
		basic(content);
	});
	it('void HTML', () => {
		const content = '<br>'.repeat(N);
		basic(content);
	});
	it('HTML attribute', () => {
		const content = `<p${' id=1'.repeat(N)}>`;
		complex(content, 'html', N * 2, 'firstChild');
	});
	it('table', () => {
		const content = '{|\n|}\n'.repeat(N);
		basic(content, N * 2);
	});
	it('table row', () => {
		const content = `{|${'\n|-'.repeat(N)}`;
		complex(content, 'table', N + 2);
	});
	it('table cell in table', () => {
		const content = `{|${'\n|'.repeat(N)}`;
		complex(content, 'table', N + 2);
	});
	it('table cell in table row', () => {
		const content = `{|\n|-${'\n|'.repeat(N)}`,
			table = Parser.parse(content).firstChild as TableToken;
		assert.strictEqual(table.type, 'table');
		assert.strictEqual(table.lastChild.length, N + 2);
	});
	it('table attribute', () => {
		const content = `{|${' id=1'.repeat(N)}`;
		complex(content, 'table', N * 2, 'lastChild');
	});
	it('hr', () => {
		const content = '----\n'.repeat(N);
		basic(content, N * 2);
	});
	it('double underscore', () => {
		const content = '__TOC__'.repeat(N);
		basic(content);
	});
	it('link', () => {
		const content = '[[a]]'.repeat(N);
		basic(content);
	});
	it('category', () => {
		const content = '[[Category:a]]'.repeat(N);
		basic(content);
	});
	it('file', () => {
		const content = '[[File:a]]'.repeat(N);
		basic(content);
	});
	it('gallery image', () => {
		const content = `<gallery>${'\na'.repeat(N)}</gallery>`;
		complex(content, 'ext', N + 1, 'lastChild');
	});
	it('image caption', () => {
		const content = `[[File:a${'|'.repeat(N)}]]`;
		complex(content, 'file', N + 1);
	});
	it('simple image attribute', () => {
		const content = `[[File:a${'|left'.repeat(N)}]]`;
		complex(content, 'file', N + 1);
	});
	it('complex image attribute', () => {
		const content = `[[File:a${'|link='.repeat(N)}]]`;
		complex(content, 'file', N + 1);
	});
	it('quote', () => {
		const content = "'' ".repeat(N);
		basic(content, N * 2);
	});
	it('external link', () => {
		const content = '[http://a]'.repeat(N);
		basic(content);
	});
	it('free external link', () => {
		const content = 'http://a '.repeat(N);
		basic(content, N * 2);
	});
	it('magic link', () => {
		const content = 'ISBN 1234567890 '.repeat(N);
		basic(content, N * 2);
	});
	it('simple list', () => {
		const content = '*\n'.repeat(N);
		basic(content, N * 2);
	});
	it('definition list', () => {
		const content = ';a:b\n'.repeat(N);
		basic(content, N * 4);
	});
	it('language conversion', () => {
		const content = '-{}-'.repeat(N);
		basic(content);
	});
	it('language conversion flag', () => {
		const content = `-{${'A;'.repeat(N)}|}-`;
		complex(content, 'converter', N + 1, 'firstChild');
	});
	it('language conversion rule', () => {
		const content = `-{${'zh:a;'.repeat(N)}}-`;
		complex(content, 'converter', N + 2);
	});
	it('extension parameter line', () => {
		const content = `<inputbox>${'\ntype'.repeat(N)}</inputbox>`;
		complex(content, 'ext', N + 1, 'lastChild');
	});
	it('imagemap internal link', () => {
		const content = `<imagemap>File:a${'\n1 [[a]]'.repeat(N)}</imagemap>`;
		complex(content, 'ext', N + 1, 'lastChild');
	});
	it('imagemap external link', () => {
		const content = `<imagemap>File:a${'\n1 [http://a]'.repeat(N)}</imagemap>`;
		complex(content, 'ext', N + 1, 'lastChild');
	});
});
