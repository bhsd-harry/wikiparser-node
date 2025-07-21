[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/a2fbe7641031451baca2947ae6d7891f)](https://app.codacy.com/gh/bhsd-harry/wikiparser-node/dashboard)
![Istanbul coverage](./coverage/badge.svg)

# Other Languages

- [简体中文](./README-%28ZH%29.md)

# Introduction

WikiParser-Node is an offline [Wikitext](https://www.mediawiki.org/wiki/Wikitext) parser developed by Bhsd for the [Node.js](https://nodejs.org/) environment. It can parse almost all wiki syntax and generate an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) ([Try it online](https://bhsd-harry.github.io/wikiparser-node/#editor)). It also allows for easy querying and modification of the AST, and returns the modified wikitext.

# Other Versions

## Mini (also known as [WikiLint](https://www.npmjs.com/package/wikilint))

This version provides a [CLI](https://en.wikipedia.org/wiki/Command-line_interface), but only retains the parsing functionality and linting functionality. The parsed AST cannot be modified. It is used for the [WikiParser Language Server](https://marketplace.visualstudio.com/items?itemName=Bhsd.vscode-extension-wikiparser) VSCode extension.

## Browser-compatible

A browser-compatible version, which can be used for code highlighting or as a linting plugin in conjunction with editors such as [CodeMirror](https://codemirror.net/) and [Monaco](https://microsoft.github.io/monaco-editor/). ([Usage example](https://bhsd-harry.github.io/wikiparser-node))

# Installation

## Node.js

Please install the corresponding version as needed (`WikiParser-Node` or `WikiLint`), for example:

```sh
npm i wikiparser-node
```

or

```sh
npm i wikilint
```

## Browser

You can download the code via CDN, for example:

```html
<script src="//cdn.jsdelivr.net/npm/wikiparser-node"></script>
```

or

```html
<script src="//unpkg.com/wikiparser-node/bundle/bundle.min.js"></script>
```

For more browser extensions, please refer to the corresponding [documentation](https://github.com/bhsd-harry/wikiparser-node/wiki/Browser-%28EN%29).

# Usage

## CLI usage

For MediaWiki sites with the [CodeMirror extension](https://mediawiki.org/wiki/Extension:CodeMirror) installed, such as different language editions of Wikipedia and other [Wikimedia Foundation-hosted sites](https://meta.wikimedia.org/wiki/Special:SiteMatrix), you can use the following command to obtain the parser configuration:

```sh
npx getParserConfig <site> <script path> [force]
# For example:
npx getParserConfig jawiki https://ja.wikipedia.org/w
```

The generated configuration file will be saved in the `config` directory. You can then use the site name for [`Parser.config`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#config).

```javascript
// For example:
Parser.config = 'jawiki';
```

## API usage

Please refer to the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home-%28EN%29).

# Performance

A full database dump (`*.xml.bz2`) scan of Chinese Wikipedia's ~3.5 million articles (parsing and linting) on a personal MacBook Air takes about 3 hours.

# Known issues

## Parser

1. Memory leaks may occur in rare cases.
1. Invalid page names with unicode characters are treated like valid ones ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Render%20invalid%20page%20names%20as%20plain%20text%20(T53090))).
1. Preformatted text with a leading space is only processed by [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml).
1. BCP 47 language codes are not supported in language conversion ([Example](https://bhsd-harry.github.io/wikiparser-node/tests.html#Explicit%20definition%20of%20language%20variant%20alternatives%20(BCP%2047%20codes))).

## HTML conversion

### Extension

1. Many extensions are not supported, such as `<indicator>` and `<ref>`.

### Transclusion

1. Most parser functions are not supported.
1. Transclusion of a subpage is not supported ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#T2561%3A%20%7B%7B%2FSubpage%7D%7D)).

### Heading

1. The table of contents (TOC) is not supported.

### HTML tag

1. Style sanitization is sometimes different ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#CSS%20safety%20test%20(all%20browsers)%3A%20vertical%20tab%20(T57332%20%2F%20CVE-2013-4567))).

### Table

1. `<caption>` elements are wrapped in `<tbody>` elements ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Trim%20whitespace%20in%20wikitext%20headings%2C%20list%20items%2C%20table%20captions%2C%20headings%2C%20and%20cells)).
1. Unclosed HTML tags in the table fostered content ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Fuzz%20testing%3A%20Parser24)).
1. `<tr>` elements should not be fostered ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Empty%20TR%20followed%20by%20a%20template-generated%20TR)).

### Link

1. Link trail is not supported ([Example](https://bhsd-harry.github.io/wikiparser-node/tests.html#1.%20Interaction%20of%20linktrail%20and%20template%20encapsulation)).
1. Links to a subpage without a slash are not supported ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Subpage%20noslash%20link)).
1. Block elements inside a link should break it into multiple links ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#%3Cpre%3E%20inside%20a%20link)).

### External link

1. External images are not supported (Examples [1](http://bhsd-harry.github.io/wikiparser-node/tests.html#External%20image), [2](http://bhsd-harry.github.io/wikiparser-node/tests.html#External%20links%3A%20Clickable%20images)).
1. No percent-encoding in displayed free external links ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Parsoid%3A%20pipe%20in%20transclusion%20parameter)).

### Block element

1. Incomplete `<p>` wrapping when there are block elements (e.g., [`<pre>`](http://bhsd-harry.github.io/wikiparser-node/tests.html#%3Cpre%3E%20inside%20a%20link), [`<div>`](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Scopes%20should%20not%20be%20expanded%20unnecessarily) or even [closing tags](http://bhsd-harry.github.io/wikiparser-node/tests.html#Non-word%20characters%20don't%20terminate%20tag%20names%20(T19663%2C%20T42670%2C%20T54022))).
1. Mixed lists ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Mixed%20Lists%3A%20Test%204)).

### Language conversion

1. Automatic language conversion is not supported.
1. Support for manual language conversion is minimal ([Example](https://bhsd-harry.github.io/wikiparser-node/tests.html#Explicit%20session-wise%20one-way%20language%20variant%20mapping%20(A%20flag%20and%20-%20flag))).

### Miscellaneous

1. Illegal HTML entities ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Illegal%20character%20references%20(T106578%2C%20T113194))).
