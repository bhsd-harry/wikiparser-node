'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src'); // eslint-disable-line no-unused-vars

/**
 * @param {string} firstChild
 * @param {accum} accum
 */
const parseLinks = (firstChild, config = Parser.getConfig(), accum = []) => {
	const parseQuotes = require('./quotes.js'),
		regex = /^([^\n<>[\]{}|]+)(?:\|(.+?))?]](.*)/s,
		regexImg = /^([^\n<>[\]{}|]+)\|(.*)/s,
		regexExt = new RegExp(`^\\s*(?:${config.protocol})`, 'i'),
		bits = firstChild.split('[[');
	let s = bits.shift();
	for (let i = 0; i < bits.length; i++) {
		let mightBeImg, link, text, after;
		const x = bits[i],
			m = x.match(regex);
		if (m) {
			[, link, text, after] = m;
			if (after.startsWith(']') && text?.includes('[')) {
				text += ']';
				after = after.slice(1);
			}
		} else {
			const m2 = x.match(regexImg);
			if (m2) {
				mightBeImg = true;
				[, link, text] = m2;
			}
		}
		if (link === undefined || regexExt.test(link) || /\x00\d+[exhbru]\x7f/.test(link)) {
			s += `[[${x}`;
			continue;
		}
		const page = link.includes('%') ? decodeURIComponent(link) : link,
			force = link.trim().startsWith(':');
		if (force && mightBeImg) {
			s += `[[${x}`;
			continue;
		}
		const title = Parser.normalizeTitle(page, 0, false, config, true),
			{ns, interwiki, valid} = title;
		if (!valid) {
			s += `[[${x}`;
			continue;
		} else if (mightBeImg) {
			if (interwiki || ns !== 6) {
				s += `[[${x}`;
				continue;
			}
			let found;
			for (i++; i < bits.length; i++) {
				const next = bits[i],
					p = next.split(']]');
				if (p.length > 2) {
					found = true;
					text += `[[${p[0]}]]${p[1]}`;
					after = p.slice(2).join(']]');
					break;
				} else if (p.length === 2) {
					text += `[[${p[0]}]]${p[1]}`;
				} else {
					text += `[[${next}`;
					break;
				}
			}
			text = parseLinks(text, config, accum);
			if (!found) {
				s += `[[${link}|${text}`;
				continue;
			}
		}
		text = text && parseQuotes(text, config, accum);
		s += `\x00${accum.length}l\x7f${after}`;
		let LinkToken = require('../src/link');
		if (!force) {
			if (!interwiki && ns === 6) {
				LinkToken = require('../src/link/file');
			} else if (!interwiki && ns === 14) {
				LinkToken = require('../src/link/category');
			}
		}
		new LinkToken(link, text, title, config, accum);
	}
	return s;
};

Parser.parsers.parseLinks = __filename;
module.exports = parseLinks;
