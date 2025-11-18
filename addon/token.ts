import {classes} from '../util/constants';
import {Shadow} from '../util/debug';
import {Token} from '../src/index';
import {CommentToken} from '../src/nowiki/comment';
import {IncludeToken} from '../src/tagPair/include';
import {ExtToken} from '../src/tagPair/ext';
import {HtmlToken} from '../src/tag/html';
import {AttributesToken} from '../src/attributes';
import type {AstRange} from '../lib/range';
import type {HeadingToken} from '../internal';

Token.prototype.createComment = /** @implements */ function(data = ''): CommentToken {
	// @ts-expect-error abstract class
	return Shadow.run((): CommentToken => new CommentToken(
		data.replaceAll('-->', '--&gt;'),
		true,
		this.getAttribute('config'),
	));
};

Token.prototype.createElement = /** @implements */ function(
	tagName,
	{selfClosing, closing} = {},
): IncludeToken | ExtToken | HtmlToken {
	const config = this.getAttribute('config'),
		include = this.getAttribute('include');
	if (tagName === (include ? 'noinclude' : 'includeonly')) {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): IncludeToken => new IncludeToken(tagName, '', undefined, selfClosing ? undefined : tagName, config),
		);
	} else if (config.ext.includes(tagName)) {
		return Shadow.run(
			// @ts-expect-error abstract class
			(): ExtToken => new ExtToken(tagName, '', undefined, selfClosing ? undefined : '', config, include),
		);
	} else if (config.html.some(tags => tags.includes(tagName))) {
		return Shadow.run((): HtmlToken => {
			// @ts-expect-error abstract class
			const attr: AttributesToken = new AttributesToken(undefined, 'html-attrs', tagName, config);
			attr.afterBuild();
			// @ts-expect-error abstract class
			return new HtmlToken(tagName, attr, Boolean(closing), Boolean(selfClosing), config);
		});
	}
	/* istanbul ignore next */
	throw new RangeError(`Invalid tag name: ${tagName}`);
};

Token.prototype.sections = /** @implements */ function(): AstRange[] | undefined {
	if (this.type !== 'root') {
		return undefined;
	}
	const {childNodes, length} = this,
		headings: [number, number][] = [...childNodes.entries()]
			.filter((entry): entry is [number, HeadingToken] => entry[1].is<HeadingToken>('heading'))
			.map(([i, {level}]) => [i, level]),
		lastHeading = [-1, -1, -1, -1, -1, -1],
		sections = headings.map(([i]) => {
			const range = this.createRange();
			range.setStart(this, i);
			return range;
		});
	for (let i = 0; i < headings.length; i++) {
		const [index, level] = headings[i]!;
		for (let j = level; j < 6; j++) {
			const last = lastHeading[j]!;
			if (last >= 0) {
				sections[last]!.setEnd(this, index);
			}
			lastHeading[j] = j === level ? i : -1;
		}
	}
	for (const last of lastHeading) {
		if (last >= 0) {
			sections[last]!.setEnd(this, length);
		}
	}
	const range = this.createRange();
	range.setStart(this, 0);
	range.setEnd(this, headings[0]?.[0] ?? length);
	sections.unshift(range);
	return sections;
};

Token.prototype.findEnclosingHtml = /** @implements */ function(tag): AstRange | undefined {
	tag &&= tag.toLowerCase();
	const {html} = this.getAttribute('config'),
		normalTags = new Set(html[0]),
		voidTags = new Set(html[2]);
	/* istanbul ignore next */
	if (voidTags.has(tag!)) {
		throw new RangeError(`Void tag: ${tag}`);
	} else if (tag && !normalTags.has(tag) && !html[1].includes(tag)) {
		throw new RangeError(`Invalid tag name: ${tag}`);
	}
	const {parentNode} = this;
	if (!parentNode) {
		return undefined;
	}
	const {childNodes} = parentNode,
		index = childNodes.indexOf(this);
	let i = index - 1,
		j;
	for (; i >= 0; i--) {
		const open = childNodes[i]!,
			{name, closing, selfClosing} = open as HtmlToken;
		if (
			open.is<HtmlToken>('html') && !closing
			&& (tag ? name === tag : !voidTags.has(name))
			&& (normalTags.has(name) || !selfClosing)
		) {
			const close = open.findMatchingTag();
			if (close) {
				j = childNodes.indexOf(close);
				if (j > index) {
					break;
				}
			}
		}
	}
	if (i === -1) {
		return parentNode.findEnclosingHtml(tag);
	}
	const range = this.createRange();
	range.setStart(parentNode, i);
	range.setEnd(parentNode, j! + 1); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
	return range;
};

classes['ExtendedToken'] = __filename;
