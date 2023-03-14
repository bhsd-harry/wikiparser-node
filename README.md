[![npm version](https://badge.fury.io/js/wikiparser-node.svg)](https://www.npmjs.com/package/wikiparser-node)
[![CodeQL](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/bhsd-harry/wikiparser-node/actions/workflows/github-code-scanning/codeql)

# 简介
wikiparser-node 是一款由 Bhsd 开发的基于 [Node.js](https://nodejs.org/en/) 环境的离线[维基文本](https://www.mediawiki.org/wiki/Wikitext)语法解析器，可以解析绝大部分的维基语法并生成[语法树](https://en.wikipedia.org/wiki/Abstract_syntax_tree)，还可以很方便地对语法树进行查询和修改，最后返回修改后的维基文本。语法树的每个节点对应一个仿照 [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) 类设计的类 [Token](https://github.com/bhsd-harry/wikiparser-node/wiki/01.-Token)。

# 使用方法

```js
var Parser = require('wikiparser-node');
```

更多文档请查阅 [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki)。

# 目录

1. [Parser](https://github.com/bhsd-harry/wikiparser-node/wiki/Home#parser)
2. [AstElement](https://github.com/bhsd-harry/wikiparser-node/wiki/01.-Token#astelement)
3. [Token](https://github.com/bhsd-harry/wikiparser-node/wiki/01.-Token#token)
4. [CommentToken](https://github.com/bhsd-harry/wikiparser-node/wiki/02.-CommentToken等#commenttoken)
5. [ExtToken](https://github.com/bhsd-harry/wikiparser-node/wiki/03.-ExtToken)
6. [AttributeToken](https://github.com/bhsd-harry/wikiparser-node/wiki/04.-AttributeToken)
7. [HeadingToken](https://github.com/bhsd-harry/wikiparser-node/wiki/05.-HeadingToken)
8. [ArgToken](https://github.com/bhsd-harry/wikiparser-node/wiki/06.-ArgToken)
9. [TranscludeToken](https://github.com/bhsd-harry/wikiparser-node/wiki/07.-TranscludeToken)
10. [ParameterToken](https://github.com/bhsd-harry/wikiparser-node/wiki/08.-ParameterToken)
11. [HtmlToken](https://github.com/bhsd-harry/wikiparser-node/wiki/09.-HtmlToken)
12. [TableToken](https://github.com/bhsd-harry/wikiparser-node/wiki/10.-TableToken)
13. [TdToken](https://github.com/bhsd-harry/wikiparser-node/wiki/11.-TdToken)
14. [DoubleUnderscoreToken](https://github.com/bhsd-harry/wikiparser-node/wiki/12.-DoubleUnderscoreToken)
15. [LinkToken](https://github.com/bhsd-harry/wikiparser-node/wiki/13.-LinkToken)
16. [CategoryToken](https://github.com/bhsd-harry/wikiparser-node/wiki/14.-CategoryToken)
17. [FileToken](https://github.com/bhsd-harry/wikiparser-node/wiki/15.-FileToken和GalleryImageToken#filetoken)
18. [ImageParameterToken](https://github.com/bhsd-harry/wikiparser-node/wiki/16.-ImageParameterToken)
19. [ExtLinkToken](https://github.com/bhsd-harry/wikiparser-node/wiki/17.-ExtLinkToken和MagicLinkToken#extlinktoken)
20. [MagicLinkToken](https://github.com/bhsd-harry/wikiparser-node/wiki/17.-ExtLinkToken和MagicLinkToken#magiclinktoken)
21. [ConverterToken](https://github.com/bhsd-harry/wikiparser-node/wiki/18.-ConverterToken)
22. [ConverterRuleToken](https://github.com/bhsd-harry/wikiparser-node/wiki/19.-ConverterRuleToken)
23. [选择器](https://github.com/bhsd-harry/wikiparser-node/wiki/20.-选择器)
24. [$ (TokenCollection)](https://github.com/bhsd-harry/wikiparser-node/wiki/21.-$-(TokenCollection))
