<div align="center"><img src="https://github.com/bhsd-harry/wikiparser-node/raw/main/logo.png" width="200" alt="WikiParser-Node logo"></div><!-- markdownlint-disable-line line-length -->

# WikiParser-HTML

[![npm version](https://badge.fury.io/js/wikiparser-html.svg)](https://www.npmjs.com/package/wikiparser-html)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/13661/badge)](https://www.bestpractices.dev/projects/13661)

WikiParser-HTML is a standalone [Wikitext](https://www.mediawiki.org/wiki/Wikitext)
parser and renderer for browser environments. Compared to the original
[WikiParser-Node](https://www.npmjs.com/package/wikiparser-node) package, it has
been optimized for browser usage with a smaller bundle size (~49 kB). It is
designed to parse Wikitext and render it as HTML, making it suitable for web
applications that need to display Wikitext content. An embedded sanitizer helps
prevent dangerous HTML tags and attributes from being rendered, enhancing
security when dealing with untrusted source content.

## Installation

You can install the package via npm and bundle it on your own:

```bash
npm i wikiparser-html
```

```js
import Parser from 'wikiparser-html';
```

## Usage

You can download the package from CDN as an ES module:

```js
import Parser from 'https://cdn.jsdelivr.net/npm/wikiparser-html';
```

## API

The full [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node) API is
documented in the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home-%28EN%29),
but WikiParser-HTML only supports methods related to Wikitext parsing and
rendering, such as [toHtml](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#tohtml).

The following example demonstrates how to use the parser to convert Wikitext to
HTML with manually registered templates:

```ts
import Parser from 'https://cdn.jsdelivr.net/npm/wikiparser-html';

// You need to supply a full parser configuration
// A limited number of presets are available in this package
const configFile = 'https://cdn.jsdelivr.net/npm/wikiparser-html/config/enwiki.json';
Parser.config = await (await fetch(configFile)).json();

// Register templates
Parser.templates.set(
	'Template:My_Template',
	'{{{1}}} {{{a}}}!',
);

// Render the wikitext to HTML
const htmlString = Parser.toHtml('{{Template:My_Template|Hello|a=World}}');
```

## Compatibility

WikiParser-HTML is written in ECMAScript 2022 and is compatible with modern
browsers. You may need to use a transpiler and/or polyfills for older browsers.

## Limitations

The table below summarizes the [extension tags](https://github.com/bhsd-harry/wikiparser-node/wiki/Extensions-%28EN%29#support)
that are supported in the original WikiParser-Node package but not in
WikiParser-HTML. If you need to parse Wikitext with these extension tags, you
should use WikiParser-Node in the backend and serve the rendered HTML to the frontend.

| Extension Tag     | WikiParser-Node | WikiParser-HTML |
|:-:                |:-:              |:-:              |
| `<ce>`            | ✓               | ✕               |
| `<charinsert>`    | ✓               | ✕               |
| `<chem>`          | ✓               | ✕               |
| `<indicator>`     | ✓               | ✕               |
| `<math>`          | ✓               | ✕               |
| `<templatedata>`  | ✓               | ✕               |
