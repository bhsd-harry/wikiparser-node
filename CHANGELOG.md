## v1.1.4

*2023-12-18*

**Fixed**

- Unexpected `remove` and `insert` events dispatched by [`Token.safeReplaceWith`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#safereplacewith)

## v1.1.3

*2023-12-16*

**Fixed**

- Fixing [`Token.sections`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#sections) since [v1.1.2](#v112)

**Changed**

- [`Token.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#findenclosinghtml) now returns an [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) object

## v1.1.2

*2023-12-13*

**Changed**

- Token type `converter-rule-noconvert` now regarded as `converter-rule-to`
- Anonymous parameters will remain anonymous after [`ParameterToken.setValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken#setvalue)

**Removed**

- `HeadingToken.name` property

## v1.1.1

*2023-12-11*

**Changed**

- [`getAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#getAttr) as the preferred method for [attribute selector](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#属性)

## v1.1.0

*2023-12-11*

**Added**

- New properties and methods for [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title) objects: `extension`, `toSubjectPage`, `toTalkPage`, `isTalkPage`, `toBasePage`, `toRootPage`

**Fixed**

- Wrapping the text after the last `</onlyinclude>` in a `NoincludeToken`
- Replacing remaining spaces in [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#title) property with underscores
- [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) now maintains its content after `insertNode`, `deleteContents`, `extractContents` and `cloneContents` methods

**Changed**

- `startContainer` and `endContainer` properties of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) now must be siblings

**Removed**

- `AstRange.intersectsNode` method

## v1.0.3

*2023-12-05*

First TypeScript version
