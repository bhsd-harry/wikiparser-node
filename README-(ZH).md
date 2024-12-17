[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)

# Other Languages

- [English](./README.md)

# 简介

WikiParser-Node 是一款由 Bhsd 开发的基于 [Node.js](https://nodejs.org/) 环境的离线[维基文本](https://www.mediawiki.org/wiki/Wikitext)语法解析器，可以解析几乎全部的维基语法并生成[语法树](https://en.wikipedia.org/wiki/Abstract_syntax_tree)（[在线解析](https://bhsd-harry.github.io/wikiparser-node/#editor)），还可以很方便地对语法树进行查询和修改，最后返回修改后的维基文本。

# 其他版本

## Mini (又名 [WikiLint](https://www.npmjs.com/package/wikilint))

提供了 [CLI](https://en.wikipedia.org/wiki/Command-line_interface)，但仅保留了解析功能和语法错误分析功能，解析生成的语法树不能修改。这个版本被应用于 [eslint-plugin-wikitext](https://www.npmjs.com/package/eslint-plugin-wikitext) 插件。

## Browser-compatible

兼容浏览器的版本，可用于代码高亮或是搭配 [CodeMirror](https://codemirror.net/) 和 [Monaco](https://microsoft.github.io/monaco-editor/) 等编辑器作为语法分析插件。（[使用实例展示](https://bhsd-harry.github.io/wikiparser-node)）

# 安装方法

## Node.js

请根据需要需要安装对应的版本（`WikiParser-Node` 或 `WikiLint`），如：

```sh
npm i wikiparser-node
```

或

```sh
npm i wikilint
```

## 浏览器

可以通过 CDN 下载代码，如：

```html
<script src="//cdn.jsdelivr.net/npm/wikiparser-node@browser"></script>
```

或

```html
<script src="//unpkg.com/wikiparser-node@browser"></script>
```

更多浏览器端可用的插件请查阅对应[文档](https://github.com/bhsd-harry/wikiparser-node/wiki/Browser)。

# 使用方法

请查阅 [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki)。
