/* NOT FOR BROWSWER */

import type * as ParserBase from '../index';

/* NOT FOR BROWSWER END */

export interface Test {
	desc: string;
	wikitext?: string;
	print?: string;
	render?: string;

	/* NOT FOR BROWSWER */

	html?: string;
}

/* NOT FOR BROWSWER */

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
