'use strict';

const /** @type {Parser} */ Parser = require('..'),
	Token = require('../src'); // eslint-disable-line no-unused-vars

/**
 * @param {Token & {firstChild: string}} token
 * @param {accum} accum
 */
const parseLinks = (token, config = Parser.getConfig(), accum = []) => {
	const parseQuotes = require('./quotes.js'),
		regex = /^([^\n<>[\]{}|]+)(?:\|(.+?))?]](.*)/s,
		regexImg = /^([^\n<>[\]{}|]+)\|(.*)/s,
		regexExt = new RegExp(`^\\s*(?:${config.protocol})`, 'i'),
		bits = token.firstChild.split('[[');
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
		if (force && mightBeImg || /[<>[\]{}|]/.test(page)) {
			s += `[[${x}`;
			continue;
		}
		const title = token.normalizeTitle(page);
		if (mightBeImg) {
			if (!title.startsWith('File:')) {
				s += `[[${x}`;
				continue;
			}
			let found;
			for (let j = i + 1; j < bits.length; j++) {
				const next = bits[j],
					p = next.split(']]');
				if (p.length > 2) {
					found = true;
					i = j;
					text += `[[${p[0]}]]${p[1]}`;
					after = p.slice(2).join(']]');
					break;
				} else if (p.length === 2) {
					text += `[[${p[0]}]]${p[1]}`;
				} else {
					break;
				}
			}
			if (!found) {
				s += `[[${x}`;
				continue;
			}
		}
		text = text && parseQuotes(text, config);
		s += `\x00${accum.length}l\x7f${after}`;
		if (!force) {
			if (title.startsWith('File:')) {
				const FileToken = require('../src/linkToken/fileToken');
				new FileToken(link, text, title, config, accum);
				continue;
			} else if (title.startsWith('Category:')) {
				const CategoryToken = require('../src/linkToken/categoryToken');
				new CategoryToken(link, text, title, config, accum);
				continue;
			}
		}
		const LinkToken = require('../src/linkToken');
		new LinkToken(link, text, title, config, accum);
	}
	return s;
};

Parser.parsers.parseLinks = __filename;
module.exports = parseLinks;
