#!/usr/bin/env node
'use strict';
const /** @type {import('./config.ts').default} */ fetchConfig = require('../dist/bin/config.js').default;
const [,, site, url, force] = process.argv;
fetchConfig(site, url, force);
