<div align="center"><img src="https://github.com/bhsd-harry/wikiparser-node/raw/main/logo.png" width="200" alt="WikiParser-Node logo"></div>

# WikiParser-Node

[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml)
[![CI](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)
[![NPM downloads](https://img.shields.io/npm/dm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)
[![jsDelivr hits (npm)](https://img.shields.io/jsdelivr/npm/hm/wikiparser-node)](https://www.npmjs.com/package/wikiparser-node)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/a2fbe7641031451baca2947ae6d7891f)](https://app.codacy.com/gh/bhsd-harry/wikiparser-node/dashboard)
![Coverage](./coverage/badge.svg)

## Other Languages

- [English](./README.md)

## 简介

WikiParser-Node 是一款由 [Bhsd](https://github.com/bhsd-harry) 开发的基于 [Node.js](https://nodejs.org/) 环境的离线[维基文本](https://www.mediawiki.org/wiki/Wikitext)语法解析器，可以解析几乎全部的[维基语法](https://www.mediawiki.org/wiki/Help:Advanced_editing)并生成[语法树](https://en.wikipedia.org/wiki/Abstract_syntax_tree)（[在线解析](https://bhsd-harry.github.io/wikiparser-node/#editor)），还可以很方便地对语法树进行查询和修改，最后返回修改后的维基文本。

尽管 WikiParser-Node 并非以将维基文本完整转换为 HTML 为主要目标，但它在很多场合中能提供实用的 HTML 渲染能力。[这里](https://bhsd-harry.github.io/wikiparser-website/)是一个使用这个库渲染的 HTML 示例页面列表，来源于 [MediaWiki.org](https://www.mediawiki.org/)。

WikiParser-Node 已使用包含约 3,000 个测试用例的官方 [MediaWiki PHP 解析器测试集](https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master/tests/parser/)进行了广泛的测试，这些测试用例涵盖了维基文本的各种边缘情况和特殊情况。测试结果可在[这里](https://bhsd-harry.github.io/wikiparser-node/tests.html)查看。

## 为什么选择 WikiParser-Node

- **维基文本与语法树的双向转换**：将维基文本解析为语法树，查询并修改节点后可以安全地写回有效的维基文本，适用于需要程序化编辑的机器人和自动化脚本。
- **面向 Node.js 的语言服务器协议（LSP）与校验能力**：为 [WikiLint](https://www.npmjs.com/package/wikilint) 和 [Wikitext LSP](https://www.npmjs.com/package/wikitext-lsp) 等工具提供解析与诊断能力，便于集成到编辑器和 CI 流程中。
- **浏览器与编辑器集成**：可与 [CodeMirror](https://www.npmjs.com/package/@bhsd/codemirror-mediawiki)、[Monaco](https://www.npmjs.com/package/monaco-wiki) 等编辑器配合使用，并已集成到 MediaWiki 官方的 [CodeMirror 扩展](https://www.mediawiki.org/wiki/Extension:CodeMirror)中。
- **大规模适用性**：在消费级硬件上对英文维基百科数据库转储文件进行解析与校验的[实际案例](https://lint-wiki-dumps.toolforge.org/)表明，处理百万级规模工作负载是可行的。
- **透明的质量信号**：本仓库包含[持续集成](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/node.js.yml)与 [CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/codeql.yml) 检查、公开的[解析器测试报告](https://bhsd-harry.github.io/wikiparser-node/tests.html)以及覆盖率报告。

## 使用者

<div align="center">
<a href="https://www.mediawiki.org/"><img src="https://www.mediawiki.org/static/images/icons/mediawikiwiki.svg" width="50" height="50" alt="MediaWiki"></a>
<a href="https://helix-editor.com/"><img src="https://helix-editor.com/logo.svg" width="50" height="50" alt="Helix"></a>
<a href="https://lsp.sublimetext.io/"><img src="https://avatars.githubusercontent.com/u/48095564?s=100" width="50" height="50" alt="LSP for Sublime Text"></a>
<a href="http://www.qbittorrent.org/"><img src="https://avatars.githubusercontent.com/u/2131270?s=100" width="50" height="50" alt="qBittorrent"></a>
</div>

## 其他版本

### Mini (又名 [WikiLint](https://www.npmjs.com/package/wikilint))

提供了 [CLI](https://en.wikipedia.org/wiki/Command-line_interface)，但仅保留了解析和语法错误分析功能，解析生成的语法树不能修改。这个版本为 [Wikitext 语言服务器协议](https://www.npmjs.com/package/wikitext-lsp)提供支持，可为 [VS Code](https://marketplace.visualstudio.com/items?itemName=Bhsd.vscode-extension-wikiparser)、[Sublime Text](https://lsp.sublimetext.io/language_servers/#mediawiki) 和 [Helix](https://github.com/helix-editor/helix/wiki/Language-Server-Configurations#wikitext) 等编辑器提供多种语言服务。

可用的语法检查规则列表请见[这里](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules)。

### Browser-compatible

兼容浏览器的版本，可用于代码高亮或是搭配 [CodeMirror](https://www.npmjs.com/package/@bhsd/codemirror-mediawiki) 和 [Monaco](https://www.npmjs.com/package/monaco-wiki) 等编辑器作为[语言服务器协议（LSP）](https://microsoft.github.io/language-server-protocol/)插件（[使用实例展示](https://bhsd-harry.github.io/wikiparser-node)）。自 1.45 版本起已集成到 MediaWiki 官方 [CodeMirror 扩展](https://www.mediawiki.org/wiki/Extension:CodeMirror)中。

### [WikiParser-Template](https://www.npmjs.com/package/wikiparser-template)

一个轻量级版本，仅支持模板的解析和操作。这个版本适用于仅需要处理模板的使用场景，例如某些专注于模板操作的的机器人或网络工具（例如 [GANReviewTool](https://en.wikipedia.org/wiki/User:Novem_Linguae/Scripts/GANReviewTool)）。

## 安装方法

### Node.js

请根据需要需要安装对应的版本（`WikiParser-Node` 或 `WikiLint`），如：

```sh
npm i wikiparser-node
```

或

```sh
npm i wikilint
```

### 浏览器

可以通过 CDN 下载代码，如：

```html
<script src="//cdn.jsdelivr.net/npm/wikiparser-node"></script>
```

或

```html
<script src="//unpkg.com/wikiparser-node/bundle/bundle-lsp.min.js"></script>
```

更多浏览器端可用的插件请查阅对应[文档](https://github.com/bhsd-harry/wikiparser-node/wiki/Browser)。

## 使用方法

### CLI 使用方法

对于安装了 [CodeMirror 扩展](https://mediawiki.org/wiki/Extension:CodeMirror)的 MediaWiki 站点，如不同语言版本的维基百科和其他[由维基媒体基金会托管的站点](https://meta.wikimedia.org/wiki/Special:SiteMatrix)，可以使用以下命令获取解析器配置：

```sh
npx getParserConfig <site> <script path> [user] [force]
# 例如：
npx getParserConfig frwiki https://fr.wikipedia.org/w user@example.net
```

生成的配置文件将保存在 [`config` 目录](https://github.com/bhsd-harry/wikiparser-node/tree/main/config/)下，然后就可以使用站点名称设置 [`Parser.config`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#config)。

```javascript
// 例如：
Parser.config = "frwiki";
```

### API 使用方法

请查阅 [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki)。其中包含一些[应用实例](https://github.com/bhsd-harry/wikiparser-node/wiki/Home#示例)展示了如何使用这个库完成各种任务。

#### 快速入门示例（TypeScript）

```ts
import Parser from "wikiparser-node";
import type {TranscludeToken} from "wikiparser-node";
Parser.config = "enwiki";
const root = Parser.parse("{{Infobox|name=Old}}\nText"),
	template = root.querySelector<TranscludeToken>("template#Template:Infobox");
template?.setValue("name", "New");
const wikitext = String(root);
assert.strictEqual(wikitext, "{{Infobox|name=New}}\nText");
```

## 性能

在一台个人的 MacBook Air 上对英文维基百科约 1900 万篇条目的数据库转储文件（`*.xml.bz2`）的一次完整[扫描](https://www.npmjs.com/package/lint-wiki-dumps)（解析和语法错误分析）需要约 5 小时。

## 最佳适用场景

- MediaWiki 机器人工作流，尤其是需要可靠的语法树操作和编辑操作时。
- Node.js 大规模维基文本校验和格式化工作流。
- 基于语言服务器协议（LSP）的语言工具。
- 浏览器端用于全站小工具、用户脚本和编辑器插件中的维基文本解析与编辑辅助功能。

## 已知问题

请参阅[英语版本](./README.md#known-issues)。
