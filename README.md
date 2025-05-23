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
<script src="//cdn.jsdelivr.net/npm/wikiparser-node@browser/bundle/bundle.min.js"></script>
```

or

```html
<script src="//unpkg.com/wikiparser-node@browser/bundle/bundle.min.js"></script>
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
1. Preformatted text with a leading space is only processed by [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml).
1. Invalid page name with unicode characters ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Render%20invalid%20page%20names%20as%20plain%20text%20(T53090))).

## HTML conversion

1. Many extensions are not supported, such as `<indicator>` and `<ref>`.
1. Most parser functions are not supported.
1. TOC is not supported.
1. Link trail is not supported ([Example](https://bhsd-harry.github.io/wikiparser-node/tests.html#1.%20Interaction%20of%20linktrail%20and%20template%20encapsulation)).
1. Incomplete `<p>` wrapping (Examples [1](http://bhsd-harry.github.io/wikiparser-node/tests.html#%3Cpre%3E%20inside%20a%20link), [2](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Scopes%20should%20not%20be%20expanded%20unnecessarily)).
1. URI encoding in free external links ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Parsoid%3A%20pipe%20in%20transclusion%20parameter)).
1. When the entire table content is fostered, the table does not have an empty `<td>` (Examples [1](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Wiki%20Tables%3A%201a.%20Fostering%20of%20entire%20template%20content), [2](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Wiki%20Tables%3A%201b.%20Fostering%20of%20entire%20template%20content), [3](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Wiki%20Tables%3A%202.%20Fostering%20of%20partial%20template%20content), [4](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Wiki%20Tables%3A%204.%20Templated%20tags%2C%20no%20content)).
1. Link to a subpage without a slash ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Subpage%20noslash%20link)).
1. Transclusion of a subpage ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#T2561%3A%20%7B%7B%2FSubpage%7D%7D)).