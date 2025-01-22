[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)
[![codebeat badge](https://codebeat.co/badges/7cdd51e6-2c5d-4a22-aae1-f5e352047d54)](https://codebeat.co/projects/github-com-bhsd-harry-wikiparser-node-main)
![Istanbul coverage](./coverage/badge.svg)

# Other Languages

- [简体中文](./README-%28ZH%29.md)

# Introduction

WikiParser-Node is an offline [Wikitext](https://www.mediawiki.org/wiki/Wikitext) parser developed by Bhsd for the [Node.js](https://nodejs.org/) environment. It can parse almost all wiki syntax and generate an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) ([Try it online](https://bhsd-harry.github.io/wikiparser-node/#editor)). It also allows for easy querying and modification of the AST, and returns the modified wikitext.

# Other Versions

## Mini (also known as [WikiLint](https://www.npmjs.com/package/wikilint))

This version provides a [CLI](https://en.wikipedia.org/wiki/Command-line_interface), but only retains the parsing functionality and linting functionality. The parsed AST cannot be modified. It is used in the [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext) plugin.

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

Please refer to the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home-%28EN%29).

# Known issues

## Parser

1. Preformatted text with a leading space is only processed by [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml).

## HTML conversion

1. Many extensions are not supported, such as `<indicator>` and `<ref>`.
1. Most parser functions are not supported.
1. TOC is not supported.
1. Link trail is not supported ([Example](https://bhsd-harry.github.io/wikiparser-node/tests.html#1.%20Interaction%20of%20linktrail%20and%20template%20encapsulation)).
1. Incomplete `<p>` wrapping (Examples [1](http://bhsd-harry.github.io/wikiparser-node/tests.html#%3Cpre%3E%20inside%20a%20link), [2](http://bhsd-harry.github.io/wikiparser-node/tests.html#Templates%3A%20Scopes%20should%20not%20be%20expanded%20unnecessarily)).
1. URI encoding in free external links ([Example](http://bhsd-harry.github.io/wikiparser-node/tests.html#Parsoid%3A%20pipe%20in%20transclusion%20parameter)).
