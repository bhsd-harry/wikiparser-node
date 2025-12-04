[![npm version](https://badge.fury.io/js/wikiparser-template.svg)](https://www.npmjs.com/package/wikiparser-template)

# Introduction

WikiParser-Template is a standalone [Wikitext](https://www.mediawiki.org/wiki/Wikitext) [template](https://www.mediawiki.org/wiki/Help:Templates) parser for the [Node.js](https://nodejs.org/) and browser environments. It is a highly simplified version of [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node), focusing solely on parsing templates and their parameters.

# Installation

You can install this CommonJS package via npm:

```sh
npm i wikiparser-template
```

# Usage

```js
import Parser from 'wikiparser-template';
```

# API

The full [WikiParser-Node](https://www.npmjs.com/package/wikiparser-node) API is documented in the [Wiki](https://github.com/bhsd-harry/wikiparser-node/wiki/Home-%28EN%29), but WikiParser-Template only supports a small subset of it. The most commonly used methods are (in TypeScript syntax):

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

