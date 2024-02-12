[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)

# Other Languages

- [简体中文](./README.md)

# Introduction

WikiParser-Node is an offline [Wikitext](https://www.mediawiki.org/wiki/Wikitext) parser developed by Bhsd for the [Node.js](https://nodejs.org/) environment. It can parse almost all wiki syntax and generate an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree) ([Try it online](https://bhsd-harry.github.io/wikiparser-node/#editor)). It also allows for easy querying and modification of the AST, and returns the modified wikitext.

# Other Versions

## Mini (also known as [WikiLint](https://www.npmjs.com/package/wikilint))

This version provides a [CLI](https://en.wikipedia.org/wiki/Command-line_interface), but only retains the parsing functionality and linting functionality. The parsed AST cannot be modified. It is used in the [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext) plugin.

## Browser-compatible

A browser-compatible version, which can be used for code highlighting or as a linting plugin in conjunction with the [CodeMirror](https://codemirror.net/) editor. ([Usage example](https://bhsd-harry.github.io/wikiparser-node))

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

For more browser extensions, please refer to the corresponding [documentation](https://github.com/bhsd-harry/wikiparser-node/wiki/Browser.en).

# Usage

Please refer to the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home.en).
