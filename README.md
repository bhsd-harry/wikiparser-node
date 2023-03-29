[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql)

# 简介

wikiparser-node 是一款由 Bhsd 开发的基于 [Node.js](https://nodejs.org/en/) 环境的离线[维基文本](https://www.mediawiki.org/wiki/Wikitext)语法解析器，可以解析绝大部分的维基语法并生成[语法树](https://en.wikipedia.org/wiki/Abstract_syntax_tree)，还可以很方便地对语法树进行查询和修改，最后返回修改后的维基文本。

# 其他版本

## Mini

仅保留了解析功能和[语法错误分析](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#lint)功能的轻量版本，解析生成的语法树不能修改。这个版本被应用于 [eslint-plugin-wikitext](/bhsd-harry/eslint-plugin-wikitext) 插件。

## Browser

兼容浏览器的版本，可用于代码高亮或是搭配 [CodeMirror5](https://codemirror.net/5/) 编辑器作为语法分析插件。（[使用实例展示](https://bhsd-harry.github.io/wikiparser-node)）

# 安装方法

## Node.js

请根据需要需要安装对应的版本（`latest` 或 `mini`），如：

```sh
npm i wikiparser-node # 默认为latest
```

或

```sh
npm i wikiparser-node@mini
```

## 浏览器

可以通过 CDN 下载代码，如：

```html
<script src="//cdn.jsdelivr.net/npm/wikiparser-node@browser/bundle/bundle.min.js"></script>
```

或

```html
<script src="//unpkg.com/wikiparser-node@browser/bundle/bundle.min.js"></script>
```

更多浏览器端可用的插件请查阅对应[文档](https://github.com/bhsd-harry/wikiparser-node/wiki/Browser)。

# 使用方法

请查阅 [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser)。
