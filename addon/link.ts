/* eslint @stylistic/operator-linebreak: [2, "before", {overrides: {"=": "after"}}] */

import {classes} from '../util/constants';
import {Shadow, isLink} from '../util/debug';
import {encode} from '../util/string';
import Parser from '../index';
import {Token} from '../src/index';
import {LinkBaseToken} from '../src/link/base';
import {LinkToken} from '../src/link/index';
import {AtomToken} from '../src/atom';

LinkBaseToken.prototype.setTarget =
	/** @implements */
	function(link): void {
		const {childNodes} = Parser.parseWithRef(link, this, 2),
			token = Shadow.run(() => new AtomToken(
				undefined,
				'link-target',
				this.getAttribute('config'),
				[],
				{'Stage-2': ':', '!ExtToken': '', '!HeadingToken': ''},
			));
		token.concat(childNodes); // eslint-disable-line unicorn/prefer-spread
		this.firstChild.safeReplaceWith(token);
	};

LinkBaseToken.prototype.setFragment =
	/** @implements */
	function(fragment): void {
		const {type, name} = this;
		if (fragment === undefined || isLink(type)) {
			fragment &&= encode(fragment);
			this.setTarget(name + (fragment === undefined ? '' : `#${fragment}`));
		}
	};

LinkBaseToken.prototype.setLinkText =
	/** @implements */
	function(linkStr): void {
		if (linkStr === undefined) {
			this.childNodes[1]?.remove();
			return;
		} else if (this.length === 1) {
			this.insertAt(Shadow.run(() => {
				const inner = new Token(undefined, this.getAttribute('config'), [], {
					'Stage-5': ':', QuoteToken: ':', ConverterToken: ':',
				});
				inner.type = 'link-text';
				return inner;
			}));
		}
		this.lastChild.safeReplaceChildren(Parser.parseWithRef(linkStr, this).childNodes);
	};

LinkToken.prototype.setLangLink =
	/** @implements */
	function(lang, link): void {
		link = link.trim();
		/* istanbul ignore if */
		if (link.startsWith('#')) {
			throw new SyntaxError('An interlanguage link cannot be fragment only!');
		}
		this.setTarget(lang + (link.startsWith(':') ? '' : ':') + link);
	};

LinkToken.prototype.asSelfLink =
	/** @implements */
	function(fragment): void {
		fragment ??= this.fragment;
		/* istanbul ignore if */
		if (!fragment?.trim()) {
			throw new RangeError('LinkToken.asSelfLink method must specify a non-empty fragment!');
		}
		this.setTarget(`#${encode(fragment)}`);
	};

LinkToken.prototype.pipeTrick =
	/** @implements */
	function(): void {
		const linkText = this.firstChild.text();
		/* istanbul ignore if */
		if (linkText.includes('#') || linkText.includes('%')) {
			throw new Error('Pipe trick cannot be used with "#" or "%"!');
		}
		const m1 = /^:?(?:[ \w\x80-\xFF-]+:)?([^(]+?) ?\(.+\)$/u.exec(linkText) as [string, string] | null;
		if (m1) {
			this.setLinkText(m1[1]);
			return;
		}
		const m2 = /^:?(?:[ \w\x80-\xFF-]+:)?([^（]+?) ?（.+）$/u.exec(linkText) as [string, string] | null;
		if (m2) {
			this.setLinkText(m2[1]);
			return;
		}
		const m3 = /^:?(?:[ \w\x80-\xFF-]+:)?(.*?)(?: ?(?<!\()\(.+\))?(?:(?:, |，|، ).|$)/u
			.exec(linkText) as string[] as [string, string];
		this.setLinkText(m3[1]);
	};

classes['ExtendedLinkToken'] = __filename;
