import {Shadow} from '../util/debug';
import {Token} from '../src/index';
import {ExtToken} from '../src/tagPair/ext';

Token.prototype.createElement = /** @implements */ function(
	tagName,
	{selfClosing} = {},
): ExtToken {
	tagName = tagName.toLowerCase();
	const config = this.getAttribute('config'),
		include = this.getAttribute('include');
	return Shadow.run(
		// @ts-expect-error abstract class
		(): ExtToken => new ExtToken(
			tagName,
			undefined,
			undefined,
			selfClosing ? undefined : tagName,
			config,
			include,
		),
	);
};
