[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/a2fbe7641031451baca2947ae6d7891f)](https://app.codacy.com/gh/bhsd-harry/wikiparser-node/dashboard)
![Istanbul coverage](./coverage/badge.svg)

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

## CLI 使用方法

对于安装了 [CodeMirror 扩展](https://mediawiki.org/wiki/Extension:CodeMirror)的 MediaWiki 站点，如不同语言版本的维基百科和其他[由维基媒体基金会托管的站点](https://meta.wikimedia.org/wiki/Special:SiteMatrix)，可以使用以下命令获取解析器配置：

```sh
npx getParserConfig <site> <script path> [force]
# 例如：
npx getParserConfig jawiki https://ja.wikipedia.org/w
```

生成的配置文件将保存在 `config` 目录下，然后就可以使用站点名称设置 [`Parser.config`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#config)。

```javascript
// 例如：
Parser.config = 'jawiki';
```

## API 使用方法

请查阅 [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki)。

# 性能

在一台个人的 MacBook Air 上对中文维基百科约 280 万篇条目的一次完整扫描（解析和语法错误分析）需要约 4 小时。

# 已知问题

请参阅[英语版本](./README.md#known-issues)。
