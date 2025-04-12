import type * as ParserBase from '../index';

export interface Test {
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

/**
 * Prepare the parser for testing
 * @param Parser
 */
export const prepare = (Parser: ParserBase): void => {
	Parser.viewOnly = true;
	Parser.warning = false;
	Parser.templateDir = './test/templates';
	Parser.redirects = Object.entries(redirects) as Iterable<[string, string]> as Map<string, string>;
};
