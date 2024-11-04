## v1.13.2

*2024-11-04*

**Fixed**

- Parse and report extension tags inside `<inputbox>`/`<dynamicpagelist>`
- Parse transclusion inside `<references>`
- `{{\n=a=\n}}` is now parsed as `Template:=a=` instead of `<p>{{</p><h1>a</h1><p>}}</p>`

## v1.13.1

*2024-11-01*

**Fixed**

- Case-insensitive `<nowiki>` inside a `<pre>` tag
- HTML comments inside a `<inputbox>` tag

**Changed**

- [`IncludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/IncludeToken#lint) now also reports useless attributes

## v1.13.0

*2024-10-24*

**Added**

- New pseudo selectors [`:valid`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#valid) and [`:scope`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#scope)
- Pseudo selector [`:has()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#has) now supports relative selectors
- [`Parser.parse`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#parse) now accepts an array of token types as the third argument to specify the maximum stage of parsing

**Fixed**

- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand) now supports file names containing `꞉` as a substitute for `:` in a Windows file system
- Order of HTML/URL decoding in [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title) parsing

**Changed**

- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#lint) now reports warnings instead of errors for useless non-word characters

## v1.12.7

*2024-08-24*

**Fixed**

- [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken#lint) should not report `#` in an HTML entity as template page fragment

## v1.12.6

*2024-08-17*

**Fixed**

- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken#lint) for unknown extension tags, since [v1.12.5](#v1125)

## v1.12.5

*2024-08-16*

**Added**

- [`GalleryToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken#tohtml)
- [`GalleryToken.widths`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken#widths) and [`GalleryToken.heights`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken#heights)

**Fixed**

- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#lint) now correctly reports invalid attribute names containing `{{!}}`

## v1.12.4

*2024-08-07*

**Added**

- [`HeadingToken.id`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#id)
- New category of linting errors: duplicated id

**Fixed**

- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#tohtml) should skip language conversion for the `id` attribute
- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#tohtml) when there are more than 3 duplicated IDs
- [Descendant combinator](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#后代选择器)

**Changed**

- `ArgToken.prototype.json` no longer includes the [`default`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken#default) property

## v1.12.3

*2024-08-04*

**Fixed**

- Fix a rare case of [`LinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken#tohtml) for the [Media namespace](https://www.mediawiki.org/wiki/Help:Namespaces#Media)

## v1.12.2

*2024-07-29*

**Added**

- [`Title.prototype.getRedirection`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#getredirection) method
- [`TranscludeToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken#tohtml) for nonexistent transcluded pages and transclusion loops

**Fixed**

- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#tohtml) now correctly handles headings with duplicated IDs
- Remove unnecessary implicit leading newline from [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand)
- Remove unexpected leading space for fostered table content in [`TableToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken#tohtml)
- A valid title should not contain characters that are escaped as HTML entities twice (e.g., `&amp;amp;`)
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#solveconst) for `#switch` with a fall-through default case
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#solveconst) for `#ifeq` when comparing two numbers or strings containing HTML entities
- `Token.prototype.toHtml` for various token types that have a bold and/or italic style
[`RedirectTargetToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken#innertext) should replace underscores with spaces
- [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#fragment) should replace spaces with underscores
- Some Wikitext syntaxes at SOL, including headings and lists, are now allowed following behavior switches except `__toc__`
- `<p>` wrapping for [`TdToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken#tohtml)
- Media namespace redirects
- [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#tohtml) when `<blockquote>` interferes with indent-`<pre>`
- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken#lint) should also report reserved data attributes

**Changed**

- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#lint) no longer reports `lonely-http` for `http://` in `ext-link-text`
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand) now removes all comments and expands [`ArgToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken)
- [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken) now includes trailing blank lines
- By turning [`Parser.redirects`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#redirects) and [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#fragment) into accessors, page titles and fragments are now automatically normalized
- The second arguments of [`AstText.prototype.deleteData`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#deletedata) and [`AstText.prototype.substringData`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#substringdata) are now optional
- The first item of the `doubleUnderscore` property of [`Config`](https://github.com/bhsd-harry/wikiparser-node/wiki/types#config) is now `Record<string, string>`

## v1.11.1

*2024-07-10*

**Fixed**

- Lonely `px` should be considered as caption in [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken)

## v1.11.0

*2024-07-08*

**Added**

- `<p>` wrapping for [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#tohtml)
- Conversion from Wikitext lists to HTML
- [`ConverterToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterToken#tohtml) when there are variant flags
- [`ConverterFlagsToken.prototype.getEffectiveFlags`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterFlagsToken#geteffectiveflags) when there are variant flags
- [`FileToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken#tohtml), [`FileToken.prototype.getFrame`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken#getframe), [`FileToken.prototype.getHorizAlign`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken#gethorizalign) and [`FileToken.prototype.getVertAlign`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken#getvertalign)
- [`ImageParameterToken.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken#geturl)

**Fixed**

- [`ExtLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken#tohtml) when there are nested internal links
- [`ArgToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken#clonenode), [`AttributeToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken#clonenode), [`AttributesToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#clonenode), [`GalleryToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken#clonenode) and [`MagicLinkToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#clonenode)
- Implicit newline in [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand)
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand) for template redirects
- [`Title.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#geturl) for self links
- Definition list parsing since [v1.10.0](#v1100)
- [`LinkBaseToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken#tohtml) when wrapped by apostrophes
- [`ExtLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken#tohtml) and [`MagicLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#tohtml) for invalid URLs
- [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title) parsing with multiple consecutive spaces and/or underscores
- Self-closing `<ref>` tags inside a `<references>` tag
- [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken) should not be bold or italic
- [`ImageParameterToken.size`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken#size) when the parameter ends with `pxpx`
- [`ImageParameterToken.link`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken#link) when containing [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken)
- Image parameter parsing for `link=` followed by an invalid external link
- Framed images and manual thumbnails are always unscaled

**Changed**

- `ListBaseToken.prototype.toHtml` now returns an empty string
- [`ListBaseToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListBaseToken#getrange) now modifies the AST and returns a plain token with the type `list-range`

**Removed**

- `Token.prototype.redoQuotes` method, which does not work as expected

## v1.10.0

*2024-06-26*

**Added**

- [`AstNode.prototype.is`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#is) method
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#expand) method
- [`Parser.templateDir`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#templatedir) property
- [`Config.articlePath`](https://github.com/bhsd-harry/wikiparser-node/wiki/types#config) property
- [`Title.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#geturl) method
- [`RedirectTargetToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken#innertext) and [`MagicLinkToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#innertext) properties
- `AstNode.prototype.toHtml` method, which is an incomplete implementation of Wikitext-to-HTML conversion

**Fixed**

- [`SyntaxToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/SyntaxToken#lint) now also reports errors from its [`children`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#children)
- Parse the `caption` attribute of a `<gallery>` extension tag
- Fix [`LinkToken.prototype.pipeTrick`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken#pipetrick)
- Absolute path on Windows in [`Parser.config`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#config) and [`Parser.i18n`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#i18n)
- [`Token.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#clonenode) when applied to a `root` token
- Pseudo selector [`:any-link`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#any-link) for [`RedirectTargetToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken)
- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken#lint) now reports duplicated `class` attributes

**Changed**

- [`LinkBaseToken.prototype.setTarget`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken#settarget) now only adds leading `:` when necessary
- [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#lint) now only reports the first occurrence of full-width punctuations in `free-ext-link` as an error
- [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken#lint) now ignores the fragment of an invalid module name
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#solveconst) now returns a copy of the original token
- [`MagicLinkToken.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#geturl) now returns a string for ISBN links
- Each [`ListToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken) now contains at most one `;`
- [`AttributeToken.prototype.getValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken#getvalue) now always trims leading and trailing whitespace

**Removed**

- `RedirectTargetToken.prototoype.text` method overriding
- `rbspan` attribute of a `<rt>` tag

## v1.9.3

*2024-06-18*

**Added**

- [`AstElement.length`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#length) and [`AstText.length`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#length) are now writable

**Fixed**

- Fix event handling for [`DoubleUnderscoreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DoubleUnderscoreToken)

**Changed**

- No longer report full-width punctuations in `ext-link-url` as an error in [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken#lint)

## v1.9.2

*2024-06-10*

**Fixed**

- Fix event handling since [v1.9.0](#v190)
- Fix issues related to [`Parser.viewOnly`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#viewonly)

## v1.9.1

*2024-06-09*

**Fixed**

- [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#font), [`AstNode.bold`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#bold) and [`AstNode.italic`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#italic) for external links which have a lower precedence than apostrophes
- Pseudo selector [`:any-link`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#any-link) for [`FileToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken)
- Pseudo selector [`:lang()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#lang)
- Pseudo selector [`:regex()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#正则选择器) for [`AttributesToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken)

**Changed**

- `Token.prototype.normalizeTitle` is now a private method
- [`Parser.getConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#getconfig) is now available for public use

**Removed**

- [Pseudo selectors](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#伪选择器) `:nth-child`, `:nth-last-child`, `:nth-of-type` and `:nth-last-of-type` no longer support comma-delimited arguments

## v1.9.0

*2024-05-26*

**Added**

- Magic links (RFC, PMID and ISBN) are now parsed as [`MagicLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken)
- New property [`Parser.viewOnly`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#viewonly), which helps to speed up [`AstElement.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#lint)

**Changed**

- Improved performance for table parsing inside a template

## v1.8.0

*2024-05-20*

**Added**

- New getters [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#font), [`AstNode.bold`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#bold) and [`AstNode.italic`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#italic)

**Fixed**

- [`Token.prototype.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#findenclosinghtml) now correctly handles self-closing tags
- `\r` is now automatically removed from EOL for CRLF (`\r\n`) line breaks

**Changed**

- [`Token.prototype.sections`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#sections) now returns an array of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) objects
- [`AstNode.nextVisibleSibling`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#nextvisiblesibling), [`AstNode.previousVisibleSibling`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#previousvisiblesibling), [`AstNode.prototype.destroy`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#destroy) and [`AstNode.prototype.getLine`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode#getline) were previously only available for [`AstElement`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement), but now they are also available for [`AstText`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText)

## v1.7.1

*2024-05-13*

**Added**

- Parse redirect pages

**Fixed**

- Allow an external image as `ext-link-text`
- Ignore duplicated parameters containing extension tags in [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken#lint)
- Self-closing tags `<noinclude/>` and `<includeonly/>` are now valid

**Changed**

- For redirects with a fragment, the fragment is now ignored by [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#title)

## v1.6.2

*2024-03-17*

**Added**

- [Parser tests](https://bhsd-harry.github.io/wikiparser-node/tests.html) are now available

**Fixed**

- Mimic the structure of CSS [combinators](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#组合器)
- Fully escape `<` and `>` when [printing](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#print) tag attributes
- Recognize invalid [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title) patterns
- Image size parameter with a suffix of `pxpx` is now also valid
- Fix conflicts between image parameters and external links
- Fix free external links led by a Unicode character

**Changed**

- Error messages are gradually translated into English

## v1.6.1

*2024-03-13*

**Added**

- Linting errors can now be disabled using inline comments

**Fixed**

- Allow the image parameter `page` in PDF file links
- Disallow empty strings as the `manual-upright` image parameter
- Use `parseInt()` for the `rowspan` and `colspan` properties of [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken)

**Changed**

- The start position of a linting error associated with a [`TrToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TrToken) is now one character ahead

## v1.5.7

*2024-03-12*

**Fixed**

- [`TableToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken#lint) now ignores inconsistent table layout due to a large `colspan` value in the last column

**Changed**

- Lowered severity of ignored lines due to no image in [`GalleryToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken#lint)

## v1.5.6

*2024-03-07*

**Fixed**

- Parsing a [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken) after another `TdToken` with a multiline [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken) in it
- [`ExtLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken) when the link text starts with a token with higher precedence

**Changed**

- [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#fragment) no longer decodes the deprecated MediaWiki-style fragment encoding

## v1.5.5

*2024-03-06*

**Fixed**

- [`ListToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken#getrange) for `<dt>` items

**Changed**

- [Attribute selectors](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#属性) now regard falsy values as non-existent attributes
- [`HeadingToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken#innertext) and [`TdToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken#innertext) now trim leading and trailing whitespace, while [`LinkToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken#innertext) trims leading whitespace only

**Removed**

- [`ImagemapToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImagemapToken) no longer overrides the [`links`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#links) getter

## v1.5.4

*2024-03-05*

**Fixed**

- Ignore most invalid Wikitext syntax nested in a [`PreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/PreToken) when linting

## v1.5.3

*2024-03-03*

**Added**

- New getter [`FileToken.extension`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken#extension)

**Fixed**

- [`DdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DdToken) is now correctly parsed when [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken) is present in the same line
- Improved [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken) validation for different file extensions
- Ignore incomplete Wikitext syntax in `before` and `after` attributes of a `<choose>` extension tag when linting

## v1.5.1

*2024-02-29*

**Added**

- New property [`rules`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser#rules) of the interface `Parser`

**Fixed**

- [`DdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DdToken) is now correctly parsed when [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken) is present in the same line

**Changed**

- `filter` in the `style` attribute is no longer reported as an error

**Removed**

- Token type aliases have been malfunctioning since [v1.4.3](#v143), and are now removed

## v1.5.0

*2024-02-22*

**Added**

- Auto-fix and suggestions for selected linting errors

**Removed**

- `AstElement.prototype.echo` method

## v1.4.5

*2024-02-12*

**Added**

- New property `rule` of the interface [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types#linterror)

## v1.4.4

*2024-02-04*

**Added**

- New category of linting errors: inconsistent [table layout](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken#getlayout)

**Fixed**

- Inconsistent output from `AttributesToken.prototype.print`

**Changed**

- `HtmlToken.prototype.print` and `ImageParameterToken.prototype.print` do not differentiate invalid tokens any more
- `HtmlToken.prototype.text` now treats void tags as self-closing tags

## v1.4.3

*2024-01-31*

**Added**

- New field `range` in the return value of [`AstElement.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement#json)

**Fixed**

- Missing type declarations for `ExtLinkToken.firstChild` and `ConverterToken.firstChild` are added

## v1.4.2

*2024-01-29*

**Fixed**

- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText#lint) no longer reports warnings for matched single brace or bracket

## v1.4.1

*2024-01-27*

**Added**

- New category of linting errors: `<ref>` or external links without specified text in [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken)
- New preset configuration [`enwiki`](https://github.com/bhsd-harry/wikiparser-node/blob/main/config/enwiki.json) for English Wikipedia

**Fixed**

- [`Token.prototype.redoQuotes`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token#redoquotes)

**Changed**

- Reported duplicated categories do not need to be child nodes of the same parent node
- Better recognition of bracket pair (`[]`) that actually breaks the [`ExtLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken)

## v1.4.0

*2024-01-23*

**Added**

- Linting errors for [`LinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken) are now also reported from [`CategoryToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken) and [`FileToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken) where applicable
- New category of linting errors: duplicated categories, and bold (either [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken) or [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken)) in [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken)

**Fixed**

- Type declarations

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
- The pseudo selector [`:invalid`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector#invalid) now reports invalid [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken) instead of redundant child nodes of [`ArgToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken)

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
