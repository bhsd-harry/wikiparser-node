'use strict';

const fs = require('fs'),
	path = require('path'),
	Parser = require('..');

const wikitext = fs.readFileSync(path.join(__dirname, 'single-page.txt'), 'utf8');

Parser.parse(wikitext).lint();
