## v1.3.10

*2024-01-23*

**Added**

- Linting errors for [`LinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken) are now also reported from [`CategoryToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken) and [`FileToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken) where applicable
- New category of linting errors: duplicated categories

## v1.3.9

*2024-01-22*

**Added**

- New categories of linting errors, including obsolete HTML tags and attributes, internal links in external links, and unmatched [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken) inside a [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken)
- New properties for [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken): `bold` and `italic`

**Fixed**

- [`Parser.isInterwiki`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#isinterwiki) now returns `null` if no interwiki prefix is found from the configuration
- Title starting with multiple colons is invalid

## v1.3.8

*2024-01-21*

**Changed**

- [`AstElement.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#json) now records [`AstText`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText) as an object instead of a plain string, and some getter properties including [`ArgToken.default`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken#default), [`HeadingToken.level`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#level), [`HtmlToken.closing`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken#closing), [`HtmlToken.selfClosing`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken#selfclosing), [`ParameterToken.anon`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken#anon), [`TableToken.closed`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken#closed), and [`TdToken.subtype`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken#subtype) are now supported

## v1.3.7

*2024-01-19*

**Fixed**

- Trailing whitespace as the last [`ConverterRuleToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterRuleToken) is now allowed

**Changed**

- Double pipes in [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken#lint) will now report an `'error'` instead of a `'warning'`

## v1.3.6

*2024-01-17*

**Changed**

- [`AttributesToken.prototype.setAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#setattr) now also accepts an attribute object as argument

## v1.3.4

*2024-01-16*

**Fixed**

- Case-insensitive magic variables like `{{server}}`
- `startIndex` and `endIndex` of [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#lint)

## v1.3.3

*2024-01-15*

**Fixed**

- A case-sensitive parser function requires a colon after the function name
- External links like `[[//xyz]]`
- Invalid closing void HTML tag except `</br>`

## v1.3.2

*2024-01-15*

**Added**

- Reporting unclosed [`IncludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/IncludeToken#lint)
- Reporting lonely `<onlyinclude>`, `<noinclude>` and `<includeonly>`
- Reporting errors such as `<pre>` inside [`PreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/PreToken)

## v1.3.1

*2024-01-14*

**Fixed**

- Parsing an illegal template name, e.g., `{{#if:{{<}}}}`

## v1.3.0

*2024-01-11*

**Changed**

- Ingoring `'http'` in tag attribute values when [linting](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#lint)

**Removed**

- `excerpt` field in [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types#linterror)

## v1.2.0

*2024-01-04*

**Fixed**

- Allowing `<` and `>` in the fragment of an internal link

**Changed**

- `HiddenToken` child nodes of [`GalleryToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken) are replaced by [`NoincludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/NoincludeToken)
- The pseudo selector [`:invalid`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#伪选择器) now reports invalid [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken) instead of redundant child nodes of [`ArgToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken)

**Removed**

- Pseudo selectors `:read-only` and `:read-write`

## v1.1.6

*2024-01-03*

**Fixed**

- Fully localized message in [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types#linterror)

## v1.1.5

*2023-12-19*

**Fixed**

- Magic words `!` and `=` are now required in [parser configurations](./config/.schema.json)

## v1.1.4

*2023-12-18*

**Added**

- New methods [`AstText.prototype.escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#escape), [`ParameterToken.prototype.escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parameter#escape) and [`MagicLinkToken.prototype.escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#escape)

**Fixed**

- Removing unexpected `remove` and `insert` events dispatched by [`Token.prototype.safeReplaceWith`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#safereplacewith)
- `{{!}}` and `{{=}}` can be part of an external link now

**Changed**

- Inserting a child node is now forbidden

## v1.1.3

*2023-12-16*

**Fixed**

- Fixing [`Token.prototype.sections`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#sections) since [v1.1.2](#v112)

**Changed**

- [`Token.prototype.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#findenclosinghtml) now returns an [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) object

## v1.1.2

*2023-12-13*

**Changed**

- Token type `converter-rule-noconvert` now regarded as `converter-rule-to`
- Anonymous parameters will remain anonymous after [`ParameterToken.prototype.setValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken#setvalue)

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

- Wrapping the text after the last `</onlyinclude>` in a [`NoincludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/NoincludeToken)
- Replacing remaining spaces in [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#title) property with underscores
- [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) now maintains its content after `insertNode`, `deleteContents`, `extractContents` and `cloneContents` methods

**Changed**

- `startContainer` and `endContainer` properties of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) must be siblings now

**Removed**

- `AstRange.prototype.intersectsNode` method

## v1.0.3

*2023-12-05*

First TypeScript version
