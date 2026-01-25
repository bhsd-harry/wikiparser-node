<div align="center"><img src="https://github.com/bhsd-harry/wikiparser-node/raw/main/logo.png" width="200" alt="WikiParser-Node logo"></div>

# WikiParser-Template

[![npm version](https://badge.fury.io/js/wikiparser-template.svg)](https://www.npmjs.com/package/wikiparser-template)

WikiParser-Template is a standalone [Wikitext](https://www.mediawiki.org/wiki/Wikitext) [template](https://www.mediawiki.org/wiki/Help:Templates) parser for the [Node.js](https://nodejs.org/) and browser environments. It is a highly simplified version of [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node), focusing solely on parsing templates and their parameters.

## Installation

You can install this CommonJS package via npm:

```sh
npm i wikiparser-template
```

## Usage

```js
import Parser from 'wikiparser-template';
```

## API

The full [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node) API is documented in the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home-%28EN%29), but WikiParser-Template only supports a small [subset](#list-of-supported-properties-and-methods) of it. The most commonly used methods are (in TypeScript syntax):

```ts
import Parser from 'wikiparser-template';
import type {Token, TranscludeToken, ParameterToken} from 'wikiparser-template';

Parser.config = {
	ext: [ // You need to specify available extension tags
		'pre',
		'nowiki',
		'gallery',
		'indicator',
	],
};

// Parse the wikitext and return the root node of the AST
const root: Token = Parser.parse(myWikitext);

// Get the first template node
const template: TranscludeToken | undefined = root.querySelector<TranscludeToken>('template');

// Get all template nodes
const templates: TranscludeToken[] = root.querySelectorAll<TranscludeToken>('template');

// Get the first template node by its name
const myTemplate: TranscludeToken = root.querySelector<TranscludeToken>('template#Template:My_Template')!;

// Template name
const templateName = myTemplate.name; // 'Template:My_Template'

// Get all template nodes by their name
const myTemplates: TranscludeToken[] = root.querySelectorAll<TranscludeToken>('template#Template:My_Template_1, template#Template:My_Template_2');

// Get the parameter `1` of the template
const param_1: ParameterToken = myTemplate.getArg(1)!;

// Get the parameter `a` of the template
const param_a: ParameterToken = myTemplate.getArg('a')!;

// Parameter name
const name_1 = param_1.name; // '1'
const name_a = param_a.name; // 'a'

// Whether the parameter is anonymous
const isAnon_1 = param_1.anon; // true
const isAnon_a = param_a.anon; // false

// Get the value of the parameter `1`
let value_1: string = param_1.getValue();

// Get the value of the parameter `1` from the template node
value_1 = myTemplate.getValue(1)!;

// Append new anonymouse parameters to the template
myTemplate.append('anonymous parameter', 'another anonymous parameter');

// Set the value of the parameter `1`
param_1.setValue('new value');

// Set the value of the parameter `1` from the template node
myTemplate.setValue(1, 'new value');

// Insert new anonymous parameters after the parameter `1`
param_1.after('anonymous parameter after 1');

// Insert new named parameters before the parameter `a`
param_a.before('another named parameter before a');

// Remove the parameter `1`
param_1.remove();
```

### List of Supported Properties and Methods

#### [Title](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29)

- [Title.main](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#main)
- [Title.ns](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#ns)
- [Title.prefix](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#prefix)
- [Title.title](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#title)
- [Title.valid](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#valid)

#### [AstNode](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29)

- [AstNode.childNodes](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#childnodes)
- [AstNode.firstChild](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#firstchild)
- [AstNode.lastChild](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#lastchild)
- [AstNode.nextSibling](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#nextsibling)
- [AstNode.parentNode](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#parentnode)
- [AstNode.previousSibling](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#previoussibling)
- [AstNode.after](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#after)
- [AstNode.before](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#before)
- [AstNode.remove](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#remove)

#### [AstText](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29)

- [AstText.data](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#data)
- [AstText.type](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#type)
- [AstText.deleteData](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#deletedata)
- [AstText.replaceData](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#replacedata)

#### [AstElement](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29)

- [AstElement.length](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#length)
- [AstElement.append](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#append)
- [AstElement.insertAt](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#insertat)
- [AstElement.querySelector](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#queryselector)
- [AstElement.querySelectorAll](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#queryselectorall)
- [AstElement.removeAt](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#removeat)
- [AstElement.replaceChildren](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#replacechildren)
- [AstElement.setText](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#settext)
- [AstElement.text](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#text)

#### [Token](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29)

- [Token.type](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#type)

#### [NowikiBaseToken](https://github.com/bhsd-harry/wikiparser-node/wiki/NowikiBaseToken-%28EN%29)

- [NowikiBaseToken.innerText](https://github.com/bhsd-harry/wikiparser-node/wiki/NowikiBaseToken-%28EN%29#innertext)

#### [CommentToken](https://github.com/bhsd-harry/wikiparser-node/wiki/CommentToken-%28EN%29)

- [CommentToken.closed](https://github.com/bhsd-harry/wikiparser-node/wiki/CommentToken-%28EN%29#closed)

#### [TagPairToken](https://github.com/bhsd-harry/wikiparser-node/wiki/TagPairToken-%28EN%29)

- [TagPairToken.closed](https://github.com/bhsd-harry/wikiparser-node/wiki/TagPairToken-%28EN%29#closed)
- [TagPairToken.selfClosing](https://github.com/bhsd-harry/wikiparser-node/wiki/TagPairToken-%28EN%29#selfclosing)

#### [HeadingToken](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29)

- [HeadingToken.level](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#level)

#### [TranscludeToken](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29)

- [TranscludeToken.modifier](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#modifier)
- [TranscludeToken.name](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#name)
- [TranscludeToken.getAllArgs](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getallargs)
- [TranscludeToken.getAnonArgs](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getanonargs)
- [TranscludeToken.getArg](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getarg)
- [TranscludeToken.getArgs](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getargs)
- [TranscludeToken.getValue](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getvalue)
- [TranscludeToken.isTemplate](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#istemplate)
- [TranscludeToken.setModifier](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#setmodifier)
- [TranscludeToken.setValue](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#setvalue)

#### [ParameterToken](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29)

- [ParameterToken.anon](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#anon)
- [ParameterToken.name](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#name)
- [ParameterToken.getValue](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#getvalue)
- [ParameterToken.setValue](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#setvalue)
