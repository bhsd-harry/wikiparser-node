'use strict';

const Parser = require('..');

/**
 * 解析内部链接
 * @param {string} wikitext wikitext
 * @param {accum} accum
 */
const parseLinks = (wikitext, config = Parser.getConfig(), accum = []) => {
	const parseQuotes = require('./quotes.js');
	const regex = /^([^\n<>[\]{}|]+)(?:\|(.*?[^\]]))?\]\](.*)$/su,
		regexImg = /^([^\n<>[\]{}|]+)\|(.*)$/su,
		regexExt = new RegExp(`^\\s*(?:${config.protocol})`, 'iu'),
		bits = wikitext.split('[[');
	let s = bits.shift();
	for (let i = 0; i < bits.length; i++) {
		let mightBeImg, link, text, after;
		const x = bits[i],
			m = regex.exec(x);
		if (m) {
			[, link, text, after] = m;
			if (after[0] === ']' && text?.includes('[')) {
				text += ']';
				after = after.slice(1);
			}
		} else {
			const m2 = regexImg.exec(x);
			if (m2) {
				mightBeImg = true;
				[, link, text] = m2;
			}
		}
		if (link === undefined || regexExt.test(link) || /\0\d+[exhbru]\x7F/u.test(link)) {
			s += `[[${x}`;
			continue;
		}
		let page = link;
		if (link.includes('%')) {
			try {
				page = decodeURIComponent(link);
			} catch {}
		}
		const force = link.trim()[0] === ':';
		if (force && mightBeImg) {
			s += `[[${x}`;
			continue;
		}
		const title = Parser.normalizeTitle(page, 0, false, config, true),
			{ns, valid} = title;
		if (!valid) {
			s += `[[${x}`;
			continue;
		} else if (mightBeImg) {
			if (ns !== 6) {
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
		text &&= parseQuotes(text, config, accum);
		s += `\0${accum.length}l\x7F${after}`;
		let LinkToken = require('../src/link');
		if (!force) {
			if (ns === 6) {
				LinkToken = require('../src/link/file');
			} else if (ns === 14) {
				LinkToken = require('../src/link/category');
			}
		}
		new LinkToken(link, text, title, config, accum);
	}
	return s;
};

module.exports = parseLinks;
