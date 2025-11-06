import type * as ParserBase from '../index';

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
	process.env.TZ = 'UTC';
	Parser.viewOnly = true;
	Parser.warning = false;
	Parser.now = new Date(Date.UTC(1970, 0, 1, 0, 2, 3));
	Parser.templateDir = './test/templates';
	Parser.redirects = Object.entries(redirects) as Iterable<[string, string]> as Map<string, string>;
	Parser.getConfig();
	Object.assign(Parser.config, {testArticlePath: '//example.org/wiki/'});
};
