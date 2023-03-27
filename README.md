[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikilint)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql)

# wikilint
This is a minimal version of [wikiparser-node](https://www.npmjs.com/package/wikiparser-node) specifically designed for [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext).

However, you can also directly lint Wikitext articles using this package. Here is an example:

```js
const Parser = require('wikilint');
Parser.config = './config/zhwiki'; // path to the configuration file, using Chinese Wikipedia as an example

const wikitext = 'some text',
	include = false; // whether this text will be transcluded on another page
console.log(Parser.parse(wikitext, include).lint());
```
