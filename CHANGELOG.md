<!-- markdownlint-disable first-line-h1 -->
## v1.32.1

*2025-12-15*

**Added**

- [`AttributesToken.prototype.css`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#css) now inserts the `style` attribute if not present

**Fixed**

- [`AttributeToken.prototype.setValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#setvalue) for an attribute without a value
- [`AttributesToken.classList`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#classlist) when the `class` attribute contains multiple spaces between class names
- [`AttributesToken.prototype.sanitize`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#sanitize) should leave spaces between attributes
- [`Token.prototype.createElement`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#createelement) for extension tags

## v1.32.0

*2025-12-05*

**Added**

- HTML conversion of `<syntaxhighlight>` with [Prism](https://prismjs.com/) highlighting
- [`CategoryToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken-%28EN%29#innertext)
- [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN#tohtml) now supports category links at the end of the page
- [`Parser.callParserFunction`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#callparserfunction) now supports custom parser functions defined via [`Parser.setFunctionHook`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#setfunctionhook)
- [`Title.prototype.getFileUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#getfileurl) that internally calls the `filepath` parser function to generate a `Special:Redirect/file/` URL
- [`Parser.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#lint), [`Parser.print`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#print) and [`Parser.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#tohtml)

**Fixed**

- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) should report invalid HTML attributes except for `id` for `<math>` and `<chem>` tags
- Issue with [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) when expanding `#tag`
- Issue with [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) when expanding parser functions with template arguments
- [`Token.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#clonenode) should copy the [`pageName`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#pagename) property
- [`ImageParameterToken.link`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29#link) can now be `undefined` for invalid links in gallery images

**Changed**

- [`FileToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#tohtml) now calls [`Title.prototype.getFileUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#getfileurl) to generate the `src` attribute

**Removed**

- The old schema of [`Config.parserFunction`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#config) is no longer supported

## v1.31.0

*2025-11-13*

**Added**

- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now supports more parser functions
- [`Parser.callParserFunction`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#callparserfunction)
- New category of linting errors: template arguments inside an extension tag
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now supports transclusion of redirect pages

**Fixed**

- Duplicate linting errors reported by `<ref>` tags
- [`FileToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#tohtml) for inline images with vertical alignment parameters
- [`LinkBaseToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken-%28EN%29#tohtml) for self links

## v1.30.0

*2025-11-06*

**Added**

- [`HeadingToken.prototype.section`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#section)
- [`QuoteToken.prototype.findMatchingQuote`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29#findmatchingquote) and [`QuoteToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29#getrange)
- [`NoincludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/NoincludeToken-%28EN%29#lint) now reports useless attributes like [`IncludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/IncludeToken-%28EN%29#lint)
- New category of linting errors: redirect-like text in list items and header-like text in plain text

**Fixed**

- Expanding custom parser functions defined via [`Parser.setFunctionHook`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#setfunctionhook)

## v1.29.2

*2025-10-30*

**Added**

- [`TranscludeToken.prototype.newAnonArg`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#newanonarg) and [`TranscludeToken.prototype.setValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#setvalue) now support an optional parameter to append the new parameter on a new line

**Fixed**

- Parsing empty `<translate></translate>` tag pairs

## v1.29.1

*2025-10-28*

**Added**

- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now suggests behavior switches with full-width underscores (`＿`)

**Fixed**

- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) now ignores magic link-like texts in tokens where magic links are not parsed
- [`AttributeToken.prototype.escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#escape) should ignore extension tag attributes
- Disable `AstElement.prototype.escape` for some token types

**Changed**

- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now suggests behavior switches when typing the first underscore (`_` or `＿`)

## v1.29.0

*2025-10-23*

**Added**

- [`Token.pageName`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#pagename) property that gets or sets the page name
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now supports the `int` parser function
- [`ImageParameterToken.thumb`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29#thumb) property that gets the thumbnail filename from the `manualthumb` image parameter
- New category of linting errors: invalid thumbnail filenames in image parameters

**Fixed**

- [`Parser.templateDir`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#templatedir) can now have a nested file structure to support subpages

**Changed**

- [Extension:Math](https://www.mediawiki.org/wiki/Extension:Math) is now linted via [texvcjs](https://www.npmjs.com/package/mathoid-texvcjs) instead of [MathJax](https://www.mathjax.org/)
- A copy of the [MediaWiki-flavored GeoJSON](https://www.mediawiki.org/wiki/Help:Extension:Kartographer#GeoJSON) schema is now included in the package

## v1.28.1

*2025-10-16*

**Added**

- Parse the `details` attribute of a `<ref>` extension tag
- New categories of linting errors, including `<ref>` tags in internal or external links, and invalid URLs
- Parse behavior switches with full-width underscores (`＿＿`)

## v1.28.0

*2025-09-30*

**Added**

- Better support for `<tvar>` tags from [Extension:Translate](https://www.mediawiki.org/wiki/Extension:Translate)
- The [`parameter`](https://github.com/bhsd-harry/wikiparser-node/wiki/invalid-gallery#parameter) option of the [invalid-gallery](https://github.com/bhsd-harry/wikiparser-node/wiki/invalid-gallery) rule now also reports `width` parameters of images with `pxpx` units

**Fixed**

- [`TranslateToken.prototype.setAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranslateToken-%28EN%29#setattr) and [`TranslateToken.prototype.toggleAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranslateToken-%28EN%29#toggleattr)

**Changed**

- The default severity of the [`both`](https://github.com/bhsd-harry/wikiparser-node/wiki/unmatched-tag#both) and [`selfClosing`](https://github.com/bhsd-harry/wikiparser-node/wiki/unmatched-tag#selfclosing) options of the [unmatched-tag](https://github.com/bhsd-harry/wikiparser-node/wiki/unmatched-tag) rule is now `error` instead of `warning`

## v1.27.0

*2025-09-20*

**Added**

- Language conversion in the `alt` parameter of images
- [`FileToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#lint) now also reports missing file extensions

**Fixed**

- The `id` attribute of a section header starting with underscores (`_`)
- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) should report evil attribute values such as `javascript:`

**Changed**

- The [rule severity](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#rule-configuration) can now be specified as a string: `'off'`, `'warning'` or `'error'`, which are equivalent to `0`, `1` and `2`, respectively

## v1.26.0

*2025-09-14*

**Added**

- [`Parser.lintConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#lintconfig) now supports more properties, including [`rules`](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#rule-configuration), [`computeEditInfo`](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#computeeditinfo), [`fix`](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#fix) and [`ignoreDisables`](https://github.com/bhsd-harry/wikiparser-node/wiki/Rules#ignoredisables)

**Fixed**

- TeX macro detection in [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics)

## v1.25.1

*2025-08-27*

**Added**

- [`Parser.configPaths`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#configpaths) that is used to specify additional paths to look for parser configuration files

## v1.25.0

*2025-08-19*

**Added**

- Descriptions for the quick fixes are now localized

**Changed**

- The message keys are all changed to follow the [Mediawiki convention](https://www.mediawiki.org/wiki/Manual:Coding_conventions#System_messages)

## v1.24.1

*2025-08-14*

**Added**

- [`AstNode.prototype.remove`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#remove) now takes an optional `ownLine` parameter to remove the current line if it is empty
- Quick fix for the [nested-link](https://github.com/bhsd-harry/wikiparser-node/wiki/nested-link) rule
- [`LanguageService.prototype.provideRefactoringAction`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providerefactoringaction) that provides refactoring actions for the selected text
- [`LanguageService.prototype.resolveCodeAction`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#resolvecodeaction) that resolves fix-all code actions
- The [tag-like](https://github.com/bhsd-harry/wikiparser-node/wiki/tag-like) rule now supports [custom tags](https://github.com/bhsd-harry/wikiparser-node/wiki/tag-like#tag-name)

**Fixed**

- Now `<translate>` extension tags in HTML comments or `<includeonly>` tags are not parsed
- The [bold-header](https://github.com/bhsd-harry/wikiparser-node/wiki/bold-header) rule now ignores bold apostrophes or tags inside extension tags
- No [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29) should be parsed inside a `<poem>` tag
- Quick fixes for the [url-encoding](https://github.com/bhsd-harry/wikiparser-node/wiki/url-encoding) rule should ignore special characters including `!<>[]{|}`
- `<tvar>` extension tags inside the URL of an external link is now correctly parsed

**Changed**

- Update the [`<img>` extension tag](https://github.com/moegirlwiki/mediawiki-extension-MoeImgTag)
- According to the [Wikimedia Foundation's policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy), the [`getParserConfig`](./README#cli-usage) executable, the [`Parser.fetchConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#fetchconfig) method and the [`LanguageService.prototype.setTargetWikipedia`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#settargetwikipedia) method now requires a `user` parameter to identify the user when accessing Wikimedia sites

## v1.23.0

*2025-08-01*

**Added**

- [`HtmlToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29#getrange) that returns the range of the HTML tag pair
- New properties and methods of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29): [`childNodes`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#childnodes), [`firstChild`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#firstchild), [`lastChild`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#lastchild), [`children`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#children), [`firstElementChild`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#firstelementchild), [`lastElementChild`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#lastelementchild), [`childElementCount`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#childelementcount), [`offsetHeight`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#offsetheight), [`offsetWidth`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#offsetwidth), [`getClientRects`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getclientrects), [`remove`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#remove), [`before`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#before), [`after`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#after), [`replaceWith`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#replacewith), [`append`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#append), [`prepend`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#prepend), [`removeChild`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#removeChild), [`getRootNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getrootnode), [`closest`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#closest), [`querySelector`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#queryselector), [`querySelectorAll`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#queryselectorall), [`getElementByTypes`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getelementbytypes), [`getElementById`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getelementbyid), [`getElementsByClassName`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getelementsbyclassname), [`getElementsByTagName`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#getelementsbytagname), [`escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#escape)

**Fixed**

- Updated tag attributes for the `<ref>` extension tag

## v1.22.1

*2025-07-25*

**Added**

- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics) now includes available quick fixes for Stylelint errors

**Fixed**

- [`AstRange.endIndex`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29#endindex) when the range is not empty

**Changed**

- The preset configuration for Moegirlpedia is updated to support the latest version of [Extension:MoeImgTag](https://github.com/moegirlwiki/mediawiki-extension-MoeImgTag)

## v1.22.0

*2025-07-22*

**Added**

- Now the rule configuration for `Token.prototype.lint` can be set via [`Parser.lintConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#lintconfig)
- [`Parser.getWMFSite`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#getwmfsite) that returns the name and host name of a MediaWiki sites [hosted by Wikimedia](https://meta.wikimedia.org/wiki/Special:SiteMatrix)
- [`LanguageService.prototype.setTargetWikipedia`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#settargetwikipedia) now supports other WMF-hosted sites
- [`Title.prototype.toSubjectPage`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#tosubjectpage), [`Title.prototype.toTalkPage`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#totalkpage), [`Title.prototype.toBasePage`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#tobasepage) and [`Title.prototype.toRootPage`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#torootpage) now return the `Title` object itself for chaining
- [`TranscludeToken.prototype.getFrame`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getframe) that returns a basic JSON [frame object](https://www.mediawiki.org/wiki/Extension:Scribunto/Lua_reference_manual#frame-object) for the `#invoke` parser function
- [`Parser.setFunctionHook`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#setfunctionhook) that defines a custom parser function hook for the [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) method
- [`Parser.setHook`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#sethook) that defines a custom extension tag hook for the [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) method
- [`Title.displayTitle`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#displaytitle)

**Fixed**

- [`Parser.normalizeTitle`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#normalizetitle) now correctly handles titles with nested transclusions
- Conversion rules can have upper-case letters in their variant names

**Changed**

- The preset configurations are updated
- For [Moegirlpedia](https://zh.moegirl.org.cn/), `<img>` tags are now parsed as extension tags ([Extension:MoeImgTag](https://github.com/moegirlwiki/mediawiki-extension-MoeImgTag)) instead of HTML tags
- Lowered severity of invalid gallery image parameters and duplicate categories
- Lowered severity of unmatched HTML tags
- Lowered severity of plain-text apostrophes next to bold/italic apostrophes
- Lowered severity of unclosed apostrophes in section headers
- Lowered severity of fostered table content
- Lowered severity of double square brackets or curly braces
- Lowered severity of lonely `http://` or `https://`

## v1.21.3

*2025-07-14*

**Fixed**

- HTML conversion of `<poem>` containing `<nowiki>` or leading `:`
- HTML conversion of `<h1>` to `<h6>` without and `id` attribute
- [HeadingToken](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29) as the first token of a `<poem>` tag does not need to be on a new line
- Sanitization of [AttributeToken](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29)
- Use the legacy `rgba()` function instead of `#rrggbbaa` in [`LanguageService.prototype.provideColorPresentations`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecolorpresentations) for colors with an alpha channel
- `NowikiToken.prototype.cloneNode` should copy the `name` attribute if it exists

**Changed**

- The object parameter of [`Parser.createLanguageService`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#createlanguageservice) is now optional

## v1.21.2

*2025-06-12*

**Added**

- [`TranscludeToken.function`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#function)
- Some time-related variables are now expanded, e.g., `CURRENTMONTH` and `LOCALMONTH`
- `Parser.now` property that specifies the current time for parsing

**Fixed**

- An issue with one-line definition lists (`;:`) when `;` is followed by whitespace
- An occasional issue with multi-level indentation in a one-line definition list (`;;dt::dd`)

**Changed**

- `TranscludeToken.prototype.print` now highlights the modifiers (e.g., `subst:`) as magic words
- [`AttributeToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#tohtml) now drops empty `id` attributes
- Lowered severity of unnecessary URL encoding in internal links

## v1.21.1

*2025-06-07*

**Added**

- [`AstElement.prototype.print`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#print) now adds a red wavy underline to invalid wikitext
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now supports percent-encoded file names (e.g., `%3F` for `?`)

**Fixed**

- Interaction between one-line definition lists (`;:`) and void HTML tags

## v1.21.0

*2025-05-29*

**Added**

- `Token.prototype.lint` called on the root node now returns an optional `output` property, which is a string after all auto-fixes are applied
- [`TranscludeToken.module`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#module)

## v1.20.3

*2025-05-12*

**Fixed**

- Wrong message keys in simplified Chinese localization

**Changed**

- Lowered severity of useless fragments
- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) now ignores the `group` attribute of a `<ref>` or `<references>` tag
- Lowered severity of lonely language conversion brackets
- Lowered severity of an unexpected template argument

## v1.20.2

*2025-05-09*

**Changed**

- Lowered severity of a duplicated image caption consisting of a template or a magic word

## v1.20.1

*2025-04-26*

**Fixed**

- [`AttributesToken.name`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#name) should be `td`, `th` or `caption` for table cells
- [`AttributeToken.tag`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#tag) should be `td`, `th` or `caption` for table cells

**Changed**

- Lowered severity of a lonely apostrophe followed by a closing bold/italic mark
- Lowered severity of a lonely bracket surrounding an internal or external link
- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) now ignores the `name` attribute of a `<ref>` tag
- Lowered severity of lonely `RFC`, `PMID` or `ISBN`
- Lowered severity from [`RedirectTargetToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken-%28EN%29#lint)
- Lowered severity of multiline comments inside `<gallery>`
- Lowered severity of disallowed HTML tags

## v1.20.0

*2025-04-16*

**Added**

- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now supports extension tags `<math>` and `<chem>`
- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics) now reports unknown macros in extension tags `<math>` and `<chem>`
- Accepted attribute names for extension tags `<math>`, `<chem>`, `<phonos>`, `<section>`, `<syntaxhighlight>`, `<timeline>` and `<quiz>`
- Parse the extension tag `<hiero>`
- Parse [Extension:Translate](https://www.mediawiki.org/wiki/Extension:Translate)

**Fixed**

- External links starting with `//` in `<imagemap>` are valid
- Internal links with empty alt text in `<imagemap>` are valid
- The executable [`getParserConfig`](./README#cli-usage) for MediaWiki sites not [hosted by Wikimedia](https://meta.wikimedia.org/wiki/Special:SiteMatrix)
- More potential stack overflow issues
- Do not suggest more than 6 consecutive `=` when fixing unbalanced `=` in a section header
- A unicode number before a URL protocol prevents it from being parsed as an external link

## v1.19.0

*2025-04-07*

**Added**

- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics) now supports extension tags `<math>` and `<chem>` if [MathJax](https://www.mathjax.org/) is available

**Fixed**

- [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29) containing comments that do not break the parameter syntax

## v1.18.4

*2025-04-03*

**Added**

- [`Parser.fetchConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#fetchconfig) that executes the [`getParserConfig`](./README#cli-usage) executable
- [`TranscludeToken.prototype.getPossibleValues`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getpossiblevalues) now supports the `#switch` parser function

**Fixed**

- More cases where potential memory leak may occur
- Expansion of `#switch`
- [`TableToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#lint) now handles arguments and a set of magic words recursively
- Stack overflow in `TableToken.prototype.getLayout`
- Issue with [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) when the text contains certain unicode characters

**Changed**

- Lowered severity of fostered content of `#invoke` in [`TableToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#lint)

## v1.18.3

*2025-03-24*

**Added**

- `AstElement.prototype.escape` method that escapes `=` and `|` characters for building a template parameter

**Fixed**

- Stack overflow when there are too many tokens in a page
- [`TableToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#lint) should not report appropriate HTML tags (`<tr>`, `<td>`, `<th>` and `<caption>`) as `fostered-content`

**Changed**

- [`ParameterToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#json) now includes the [`duplicated`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#duplicated) property only if it is `true`
- [`TdToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#json) now includes the [`rowspan`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#rowspan) and [`colspan`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#colspan) properties only if they are greater than `1`
- [`FileToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#lint) now reports warnings instead of errors for duplicated `caption` parameters of an unknown file type

## v1.18.2

*2025-03-15*

**Added**

- [`Config.functionHook`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#config) property
- [`LanguageService.prototype.provideLinks`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providelinks) now supports the `filepath` parser function
- New preset configuration [`jawiki`](https://github.com/bhsd-harry/wikiparser-node/blob/main/config/jawiki.json) for Japanese Wikipedia
- The executable [`getParserConfig`](./README#cli-usage) now supports more MediaWiki sites with the [CodeMirror extension](https://mediawiki.org/wiki/Extension:CodeMirror) installed

**Fixed**

- Only function hooks are allowed to take parameters
- Localized parser functions with a full-width colon `：` instead of a half-width colon `:`

**Changed**

- [`LanguageService.prototype.resolveRenameLocation`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#resolverenamelocation) no longer supports magic words

## v1.18.1

*2025-03-13*

**Added**

- [`LanguageService.prototype.setTargetWikipedia`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#settargetwikipedia) that updates the parser configuration for a specific Wikipedia language edition
- [`LanguageService.prototype.provideDocumentColors`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providedocumentcolors) now supports color names in `style` attributes
- [`LanguageService.prototype.provideHover`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providehover) now supports HTML tags and attributes
- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) now reports invalid attribute values of HTML tags

## v1.18.0

*2025-03-11*

**Added**

- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now provide documentations for suggested magic words
- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics) and [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now support the `score` extension tag written in [LilyPond](https://lilypond.org)
- New executable [`getParserConfig`](./README#cli-usage)

**Fixed**

- Unhandled promise rejection in [`LanguageService`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29) if [Stylelint](https://www.npmjs.com/package/stylelint) is unavailable
- Manual upright parameters (e.g., `upright=$1`) of images are not treated as upright parameters
- The magic words `#section`, `#section-x` and `#section-h` are recognized as aliases of `#lst`, `#lstx` and `#lsth`, respectively

**Changed**

- The behavior switch `__DISAMBIG__` now has the name `DISAMBIGUATION`, and the behavior switch `__EXPECTED_UNCONNECTED_PAGE__` now has the name `EXPECTEDUNCONNECTEDPAGE`

## v1.17.1

*2025-03-08*

**Added**

- [`Token.prototype.buildLists`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#buildlists) that builds all `list-range` tokens
- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics), [`LanguageService.prototype.provideHover`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providehover) and [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now work for embedded JSON in extension tags (`templatedata`, `mapframe` and `maplink`) and inline CSS
- [`LanguageService.prototype.provideFoldingRanges`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providefoldingranges) now works for embedded JSON in extension tags (`templatedata`, `mapframe` and `maplink`)
- `Token.prototype.lint` now reports errors and warnings for inline CSS
- [`AttributeToken.prototype.css`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#css) that gets or sets the value of a CSS property
- [`AttributeToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#json) now includes the [`tag`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#tag) property
- [`LanguageService.include`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#include) property that configures the transclusion option for parsing

**Fixed**

- [`Token.prototype.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#findenclosinghtml)
- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) for attribute keys of extension tags, HTML tags and tables
- Various issues with [`Token.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#clonenode)
- [`Title.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#geturl) now ignores an empty fragment

**Changed**

- [`HtmlToken.prototype.findMatchingTag`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29#findmatchingtag) now returns `undefined` if there is no matching tag instead of throwing a syntax error

## v1.16.6

*2025-02-26*

**Fixed**

- Potential memory leak when parsing a page with a large number of transclusions

**Changed**

- A [`LanguageService`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29) instance can provide both signature help and other services

## v1.16.5

*2025-02-25*

**Added**

- English translation for JSDoc annotations
- [`LinkBaseToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken-%28EN%29#json) now includes the [`fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken-%28EN%29#fragment) property
- [`CategoryToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken-%28EN%29#json) now includes the [`sortKey`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken-%28EN%29#sortkey) property
- [`FileToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#json) now includes the [`extension`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#extension) property
- `ListToken.indent` property
- [`ListToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken-%28EN%29#json) now includes the [`indent`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken-%28EN%29#indent) property
- [`TdToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#json) now includes the [`rowspan`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#rowspan) and [`colspan`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#colspan) properties
- [`ArgToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#json) now includes the [`default`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#default) property
- [`ConverterRuleToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterRuleToken-%28EN%29#json) now includes the [`variant`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterRuleToken-%28EN%29#variant) property
- `GalleryToken.prototype.json` now includes the [`widths`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#widths) and [`heights`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#heights) properties
- [`ParameterToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#json) now includes the [`duplicated`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#duplicated) property

**Fixed**

- [`LanguageService.prototype.provideHover`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providehover) for variables without a parameter
- [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml) when there are mixed apostrophes and `<b>`/`<i>` tags

## v1.16.4

*2025-02-21*

**Added**

- [`TranscludeToken.prototype.getModule`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#getmodule) that returns the module name and the function name of a `#invoke` parser function
- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) now suggests parameter keys for the `#invoke` parser function

**Fixed**

- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) should not suggest argument names, link targets, template names, parameter keys or image widths at the cursor position
- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) should suggest with a leading `:` for the transclusion of a main namespace article
- [`AstElement.links`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#links) should not return internal links inside the link parameter of an image twice
- [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#font) for nodes following an external link
- [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#font) when there are unmatched `<b>` or `<i>` tags
- [`LanguageService.prototype.provideRenameEdits`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providerenameedits) should not rename the `name` attribute of a `<ref>` tag with a different `group` attribute

**Changed**

- [`LanguageService.prototype.provideDefinition`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providedefinition) now returns the [`Location`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#location) of the `<ref>` inner content for any [`Position`](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#position) within a `<ref>` tag that has a `name` attribute
- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) inserts a `>` character after completing a closing tag when necessary
- [`LanguageService.prototype.provideCompletionItems`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providecompletionitems) inserts a `=` character after completing a template parameter key when necessary

## v1.16.3

*2025-02-16*

**Added**

- [`LanguageService.prototype.provideInlayHints`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#provideinlayhints) that computes inlay hints for template anonymous parameters
- [`AstNode.prototype.getLines`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#getlines) that returns an array of the source text, the start and end positions of each line
- Signatures of more parser functions from extensions

**Fixed**

- [`LanguageService.prototype.provideDiagnostics`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#providediagnostics) now reports warnings
- [`LanguageService.prototype.resolveRenameLocation`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29#resolverenamelocation) should ignore file and category links
- The outputs of [`wikiparse.Linter.prototype.codemirror`](https://github.com/bhsd-harry/wikiparser-node/wiki/wikiparse.Linter-%28EN%29#codemirror) and [`wikiparse.Linter.prototype.monaco`](https://github.com/bhsd-harry/wikiparser-node/wiki/wikiparse.Linter-%28EN%29#monaco) now strictly follow the [CodeMirror](https://codemirror.net/docs/ref/#lint.Diagnostic) and [Monaco Editor](https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IMarkerData.html) specifications, respectively

**Changed**

- The return values of [`AstElement.prototype.caretPositionfromIndex`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#caretpositionfromindex) and its related methods are now different if the index is at the boundary between two tokens
- [`AstElement.prototype.elementFromIndex`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#elementfromindex) and its related methods now return [`Token`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29) instead of [`AstNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29)

## v1.16.1

*2025-02-10*

**Added**

- [`Parser.createLanguageService`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#createlanguageservice) will create a [`LanguageService`](https://github.com/bhsd-harry/wikiparser-node/wiki/LanguageService-%28EN%29) instance that provides various functions
- [`Config.articlePath`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#config) does not have to include `'$1'` now

**Fixed**

- `"sideEffects": false` is now added to `package.json` to facilitate tree-shaking
- `{{名字空间}}` and `{{命名空間}}` are now correctly recognized as `{{NAMESPACE}}`

## v1.15.1

*2025-01-30*

**Fixed**

- `&lt;` and `&gt;` in external links

**Changed**

- Full HTML entity decoding via [entities](https://www.npmjs.com/package/entities)

**Removed**

- Interwiki prefixes are no longer available from the preset configuration files

## v1.15.0

*2025-01-15*

**Fixed**

- Case-insensitive variables without a parameter, e.g., `#language`, and case-sensitive parser functions requiring a parameter, e.g., `DEFAULTSORT`

**Changed**

- The [schema](./config/.schema.json) for parser configurations is changed, including changes for the `parserFunction` and `doubleUnderscore` properties and a new `variable` property

## v1.14.1

*2025-01-11*

**Added**

- Named parameters are recognized for the `#tag` parser function

## v1.14.0

*2024-12-13*

**Added**

- More auto-fix and suggestions for linting errors

**Removed**

- Removed category of linting errors: duplicated `<ref>` name

## v1.13.9

*2024-12-06*

**Added**

- New category of linting errors: lonely `RFC`/`PMID`/`ISBN`
- [`LintError.Fix`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#linterrorfix) now has a new string property `desc`

**Changed**

- The preset configurations are updated

## v1.13.7

*2024-12-01*

**Fixed**

- `Token.prototype.lint` should ignore `<ref>` tags with identical names but in different groups

## v1.13.6

*2024-11-29*

**Added**

- New category of linting errors: duplicated `<ref>` name

## v1.13.4

*2024-11-17*

**Fixed**

- [`TranscludeToken.name`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#name) for some new parser functions, e.g., `#dir`

## v1.13.3

*2024-11-14*

**Fixed**

- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) now correctly reports invalid attribute names of `<pre>` tags

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

- [`IncludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/IncludeToken-%28EN%29#lint) now also reports useless attributes

## v1.13.0

*2024-10-24*

**Added**

- New pseudo selectors [`:valid`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#valid) and [`:scope`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#scope)
- Pseudo selector [`:has()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#has) now supports relative selectors
- [`Parser.parse`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#parse) now accepts an array of token types as the third argument to specify the maximum stage of parsing

**Fixed**

- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now supports file names containing `꞉` as a substitute for `:` in a Windows file system
- Order of HTML/URL decoding in [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29) parsing

**Changed**

- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#lint) now reports warnings instead of errors for useless non-word characters

## v1.12.7

*2024-08-24*

**Fixed**

- [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#lint) should not report `#` in an HTML entity as template page fragment

## v1.12.6

*2024-08-17*

**Fixed**

- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) for unknown extension tags, since [v1.12.5](#v1125)

## v1.12.5

*2024-08-16*

**Added**

- [`GalleryToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#tohtml)
- [`GalleryToken.widths`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#widths) and [`GalleryToken.heights`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#heights)

**Fixed**

- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#lint) now correctly reports invalid attribute names containing `{{!}}`

## v1.12.4

*2024-08-07*

**Added**

- [`HeadingToken.id`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#id)
- New category of linting errors: duplicated id

**Fixed**

- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#tohtml) should skip language conversion for the `id` attribute
- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#tohtml) when there are more than 3 duplicated IDs
- [Descendant combinator](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#后代选择器)

**Changed**

- [`ArgToken.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#json) no longer includes the [`default`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#default) property

## v1.12.3

*2024-08-04*

**Fixed**

- Fix a rare case of [`LinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken-%28EN%29#tohtml) for the [Media namespace](https://www.mediawiki.org/wiki/Help:Namespaces#Media)

## v1.12.2

*2024-07-29*

**Added**

- [`Title.prototype.getRedirection`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#getredirection)
- [`TranscludeToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#tohtml) for nonexistent transcluded pages and transclusion loops

**Fixed**

- [`HeadingToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#tohtml) now correctly handles headings with duplicated IDs
- Remove unnecessary implicit leading newline from [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand)
- Remove unexpected leading space for fostered table content in [`TableToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#tohtml)
- A valid title should not contain characters that are escaped as HTML entities twice (e.g., `&amp;amp;`)
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#solveconst) for `#switch` with a fall-through default case
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#solveconst) for `#ifeq` when comparing two numbers or strings containing HTML entities
- `Token.prototype.toHtml` for various token types that have a bold and/or italic style
[`RedirectTargetToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken-%28EN%29#innertext) should replace underscores with spaces
- [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#fragment) should replace spaces with underscores
- Some Wikitext syntaxes at SOL, including headings and lists, are now allowed following behavior switches except `__toc__`
- `<p>` wrapping for [`TdToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#tohtml)
- Media namespace redirects
- [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml) when `<blockquote>` interferes with indent-`<pre>`
- [`AttributeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#lint) should also report reserved data attributes

**Changed**

- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) no longer reports `lonely-http` for `http://` in `ext-link-text`
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) now removes all comments and expands [`ArgToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29)
- [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29) now includes trailing blank lines
- By turning [`Parser.redirects`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#redirects) and [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#fragment) into accessors, page titles and fragments are now automatically normalized
- The second arguments of [`AstText.prototype.deleteData`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#deletedata) and [`AstText.prototype.substringData`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#substringdata) are now optional
- The first item of the `doubleUnderscore` property of [`Config`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#config) is now `Record<string, string>`

## v1.11.1

*2024-07-10*

**Fixed**

- Lonely `px` should be considered as caption in [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29)

## v1.11.0

*2024-07-08*

**Added**

- `<p>` wrapping for [`Token.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#tohtml)
- Conversion from Wikitext lists to HTML
- [`ConverterToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterToken-%28EN%29#tohtml) when there are variant flags
- [`FileToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#tohtml), [`FileToken.prototype.getFrame`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#getframe), [`FileToken.prototype.getHorizAlign`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#gethorizalign) and [`FileToken.prototype.getVertAlign`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#getvertalign)
- [`ImageParameterToken.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29#geturl)

**Fixed**

- [`ConverterFlagsToken.prototype.getEffectiveFlags`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterFlagsToken-%28EN%29#geteffectiveflags) when there are variant flags
- [`ExtLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken-%28EN%29#tohtml) when there are nested internal links
- [`ArgToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#clonenode), [`AttributeToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#clonenode), [`AttributesToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#clonenode), [`GalleryToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#clonenode) and [`MagicLinkToken.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#clonenode)
- Implicit newline in [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand)
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand) for template redirects
- [`Title.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#geturl) for self links
- Definition list parsing since [v1.10.0](#v1100)
- [`LinkBaseToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken-%28EN%29#tohtml) when wrapped by apostrophes
- [`ExtLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken-%28EN%29#tohtml) and [`MagicLinkToken.prototype.toHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#tohtml) for invalid URLs
- [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29) parsing with multiple consecutive spaces and/or underscores
- Self-closing `<ref>` tags inside a `<references>` tag
- [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29) should not be bold or italic
- [`ImageParameterToken.size`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29#size) when the parameter ends with `pxpx`
- [`ImageParameterToken.link`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29#link) when containing [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29)
- Image parameter parsing for `link=` followed by an invalid external link
- Framed images and manual thumbnails are always unscaled

**Changed**

- `ListBaseToken.prototype.toHtml` now returns an empty string
- [`ListBaseToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListBaseToken-%28EN%29#getrange) now modifies the AST and returns a plain token with the type `list-range`

**Removed**

- `Token.prototype.redoQuotes` method, which does not work as expected

## v1.10.0

*2024-06-26*

**Added**

- [`AstNode.prototype.is`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#is)
- [`Token.prototype.expand`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#expand)
- [`Parser.templateDir`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#templatedir) and [`Parser.templates`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#templates) properties
- [`Config.articlePath`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#config) property
- [`Title.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#geturl)
- [`RedirectTargetToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken-%28EN%29#innertext) and [`MagicLinkToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#innertext) properties
- `AstNode.prototype.toHtml` method, which is an incomplete implementation of Wikitext-to-HTML conversion

**Fixed**

- [`SyntaxToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/SyntaxToken-%28EN%29#lint) now also reports errors from its [`children`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#children)
- Parse the `caption` attribute of a `<gallery>` extension tag
- Fix [`LinkToken.prototype.pipeTrick`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken-%28EN%29#pipetrick)
- Absolute path on Windows in [`Parser.config`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#config) and [`Parser.i18n`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#i18n)
- [`Token.prototype.cloneNode`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#clonenode) when applied to a `root` token
- Pseudo selector [`:any-link`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#any-link) for [`RedirectTargetToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/RedirectTargetToken-%28EN%29)
- [`AttributesToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#lint) now reports duplicated `class` attributes

**Changed**

- [`LinkBaseToken.prototype.setTarget`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkBaseToken-%28EN%29#settarget) now only adds leading `:` when necessary
- [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#lint) now only reports the first occurrence of full-width punctuations in `free-ext-link` as an error
- [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#lint) now ignores the fragment of an invalid module name
- [`Token.prototype.solveConst`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#solveconst) now returns a copy of the original token
- [`MagicLinkToken.prototype.getUrl`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#geturl) now returns a string for ISBN links
- Each [`ListToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken-%28EN%29) now contains at most one `;`
- [`AttributeToken.prototype.getValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributeToken-%28EN%29#getvalue) now always trims leading and trailing whitespace

**Removed**

- `RedirectTargetToken.prototype.text` method overriding
- `rbspan` attribute of a `<rt>` tag

## v1.9.3

*2024-06-18*

**Added**

- [`AstElement.length`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#length) and [`AstText.length`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#length) are now writable

**Fixed**

- Fix event handling for [`DoubleUnderscoreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DoubleUnderscoreToken-%28EN%29)

**Changed**

- No longer report full-width punctuations in `ext-link-url` as an error in [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#lint)

## v1.9.2

*2024-06-10*

**Fixed**

- Fix event handling since [v1.9.0](#v190)
- Fix issues related to [`Parser.viewOnly`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#viewonly)

## v1.9.1

*2024-06-09*

**Fixed**

- [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#font), [`AstNode.bold`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#bold) and [`AstNode.italic`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#italic) for external links which have a lower precedence than apostrophes
- Pseudo selector [`:any-link`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#any-link) for [`FileToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29)
- Pseudo selector [`:lang()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#lang)
- Pseudo selector [`:regex()`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#正则选择器) for [`AttributesToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29)

**Changed**

- `Token.prototype.normalizeTitle` is now a private method
- [`Parser.getConfig`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#getconfig) is now available for public use

**Removed**

- [Pseudo selectors](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#伪选择器) `:nth-child`, `:nth-last-child`, `:nth-of-type` and `:nth-last-of-type` no longer support comma-delimited arguments

## v1.9.0

*2024-05-26*

**Added**

- Magic links (RFC, PMID and ISBN) are now parsed as [`MagicLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29)
- New property [`Parser.viewOnly`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#viewonly), which helps to speed up [`AstElement.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#lint)

**Changed**

- Improved performance for table parsing inside a template

## v1.8.0

*2024-05-20*

**Added**

- New getters [`AstNode.font`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#font), [`AstNode.bold`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#bold) and [`AstNode.italic`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#italic)

**Fixed**

- [`Token.prototype.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#findenclosinghtml) now correctly handles self-closing tags
- `\r` is now automatically removed from EOL for CRLF (`\r\n`) line breaks

**Changed**

- [`Token.prototype.sections`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#sections) now returns an array of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29) objects
- [`AstNode.nextVisibleSibling`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#nextvisiblesibling), [`AstNode.previousVisibleSibling`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#previousvisiblesibling), [`AstNode.prototype.destroy`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#destroy) and [`AstNode.prototype.getLine`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstNode-%28EN%29#getline) were previously only available for [`AstElement`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29), but now they are also available for [`AstText`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29)

## v1.7.1

*2024-05-13*

**Added**

- Parse redirect pages

**Fixed**

- Allow an external image as `ext-link-text`
- Ignore duplicated parameters containing extension tags in [`TranscludeToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TranscludeToken-%28EN%29#lint)
- Self-closing tags `<noinclude/>` and `<includeonly/>` are now valid

**Changed**

- For redirects with a fragment, the fragment is now ignored by [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#title)

## v1.6.2

*2024-03-17*

**Added**

- [Parser tests](https://bhsd-harry.github.io/wikiparser-node/tests.html) are now available

**Fixed**

- Mimic the structure of CSS [combinators](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#组合器)
- Fully escape `<` and `>` when [printing](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#print) tag attributes
- Recognize invalid [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29) patterns
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
- Use `parseInt()` for the `rowspan` and `colspan` properties of [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29)

**Changed**

- The start position of a linting error associated with a [`TrToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TrToken-%28EN%29) is now one character ahead

## v1.5.7

*2024-03-12*

**Fixed**

- [`TableToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#lint) now ignores inconsistent table layout due to a large `colspan` value in the last column

**Changed**

- Lowered severity of ignored lines due to no image in [`GalleryToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29#lint)

## v1.5.6

*2024-03-07*

**Fixed**

- Parsing a [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29) after another `TdToken` with a multiline [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29) in it
- [`ExtLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken-%28EN%29) when the link text starts with a token with higher precedence

**Changed**

- [`Title.fragment`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#fragment) no longer decodes the deprecated MediaWiki-style fragment encoding

## v1.5.5

*2024-03-06*

**Fixed**

- [`ListToken.prototype.getRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/ListToken-%28EN%29#getrange) for `<dt>` items

**Changed**

- [Attribute selectors](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#属性) now regard falsy values as non-existent attributes
- [`HeadingToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#innertext) and [`TdToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#innertext) now trim leading and trailing whitespace, while [`LinkToken.innerText`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken-%28EN%29#innertext) trims leading whitespace only

**Removed**

- [`ImagemapToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImagemapToken-%28EN%29) no longer overrides the [`links`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#links) getter

## v1.5.4

*2024-03-05*

**Fixed**

- Ignore most invalid Wikitext syntax nested in a [`PreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/PreToken-%28EN%29) when linting

## v1.5.3

*2024-03-03*

**Added**

- New getter [`FileToken.extension`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29#extension)

**Fixed**

- [`DdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DdToken-%28EN%29) is now correctly parsed when [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29) is present in the same line
- Improved [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29) validation for different file extensions
- Ignore incomplete Wikitext syntax in `before` and `after` attributes of a `<choose>` extension tag when linting

## v1.5.1

*2024-02-29*

**Added**

- New property [`rules`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#rules) of the interface `Parser`

**Fixed**

- [`DdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/DdToken-%28EN%29) is now correctly parsed when [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29) is present in the same line

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

- New property `rule` of the interface [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#linterror)

## v1.4.4

*2024-02-04*

**Added**

- New category of linting errors: inconsistent [table layout](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#getlayout)

**Fixed**

- Inconsistent output from `AttributesToken.prototype.print`

**Changed**

- `HtmlToken.prototype.print` and `ImageParameterToken.prototype.print` do not differentiate invalid tokens any more
- `HtmlToken.prototype.text` now treats void tags as self-closing tags

## v1.4.3

*2024-01-31*

**Added**

- New field `range` in the return value of [`AstElement.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#json)

**Fixed**

- Missing type declarations for `ExtLinkToken.firstChild` and `ConverterToken.firstChild` are added

## v1.4.2

*2024-01-29*

**Fixed**

- [`AstText.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint) no longer reports warnings for matched single brace or bracket

## v1.4.1

*2024-01-27*

**Added**

- New category of linting errors: `<ref>` or external links without specified text in [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29)
- New preset configuration [`enwiki`](https://github.com/bhsd-harry/wikiparser-node/blob/main/config/enwiki.json) for English Wikipedia

**Fixed**

- [`Token.prototype.redoQuotes`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#redoquotes)

**Changed**

- Reported duplicated categories do not need to be child nodes of the same parent node
- Better recognition of bracket pair (`[]`) that actually breaks the [`ExtLinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ExtLinkToken-%28EN%29)

## v1.4.0

*2024-01-23*

**Added**

- Linting errors for [`LinkToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/LinkToken-%28EN%29) are now also reported from [`CategoryToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/CategoryToken-%28EN%29) and [`FileToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/FileToken-%28EN%29) where applicable
- New category of linting errors: duplicated categories, and bold (either [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29) or [`HtmlToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29)) in [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29)

**Fixed**

- Type declarations

## v1.3.9

*2024-01-22*

**Added**

- New categories of linting errors, including obsolete HTML tags and attributes, internal links in external links, and unmatched [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29) inside a [`HeadingToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29)
- New properties for [`QuoteToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/QuoteToken-%28EN%29): `bold` and `italic`

**Fixed**

- [`Parser.isInterwiki`](https://github.com/bhsd-harry/wikiparser-node/wiki/Parser-%28EN%29#isinterwiki) now returns `null` if no interwiki prefix is found from the configuration
- Title starting with multiple colons is invalid

## v1.3.8

*2024-01-21*

**Changed**

- [`AstElement.prototype.json`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstElement-%28EN%29#json) now records [`AstText`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29) as an object instead of a plain string, and some getter properties including [`ArgToken.default`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29#default), [`HeadingToken.level`](https://github.com/bhsd-harry/wikiparser-node/wiki/HeadingToken-%28EN%29#level), [`HtmlToken.closing`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29#closing), [`HtmlToken.selfClosing`](https://github.com/bhsd-harry/wikiparser-node/wiki/HtmlToken-%28EN%29#selfclosing), [`ParameterToken.anon`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#anon), [`TableToken.closed`](https://github.com/bhsd-harry/wikiparser-node/wiki/TableToken-%28EN%29#closed), and [`TdToken.subtype`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#subtype) are now supported

## v1.3.7

*2024-01-19*

**Fixed**

- Trailing whitespace as the last [`ConverterRuleToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ConverterRuleToken-%28EN%29) is now allowed

**Changed**

- Double pipes in [`TdToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/TdToken-%28EN%29#lint) will now report an `'error'` instead of a `'warning'`

## v1.3.6

*2024-01-17*

**Changed**

- [`AttributesToken.prototype.setAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#setattr) now also accepts an attribute object as argument

## v1.3.4

*2024-01-16*

**Fixed**

- Case-insensitive magic variables like `server`
- `startIndex` and `endIndex` of [`MagicLinkToken.prototype.lint`](https://github.com/bhsd-harry/wikiparser-node/wiki/MagicLinkToken-%28EN%29#lint)

## v1.3.3

*2024-01-15*

**Fixed**

- A case-sensitive parser function requires a colon after the function name
- External links like `[[//xyz]]`
- Invalid closing void HTML tag except `</br>`

## v1.3.2

*2024-01-15*

**Added**

- Reporting unclosed [`IncludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/IncludeToken-%28EN%29#lint)
- Reporting lonely `<onlyinclude>`, `<noinclude>` and `<includeonly>`
- Reporting errors such as `<pre>` inside [`PreToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/PreToken-%28EN%29)

## v1.3.1

*2024-01-14*

**Fixed**

- Parsing an illegal template name, e.g., `{{#if:{{<}}}}`

## v1.3.0

*2024-01-11*

**Changed**

- Ingoring `'http'` in tag attribute values when [linting](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#lint)

**Removed**

- `excerpt` field in [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#linterror)

## v1.2.0

*2024-01-04*

**Fixed**

- Allowing `<` and `>` in the fragment of an internal link

**Changed**

- `HiddenToken` child nodes of [`GalleryToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/GalleryToken-%28EN%29) are replaced by [`NoincludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/NoincludeToken-%28EN%29)
- The pseudo selector [`:invalid`](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#invalid) now reports invalid [`ImageParameterToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ImageParameterToken-%28EN%29) instead of redundant child nodes of [`ArgToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/ArgToken-%28EN%29)

**Removed**

- Pseudo selectors `:read-only` and `:read-write`

## v1.1.6

*2024-01-03*

**Fixed**

- Fully localized message in [`LintError`](https://github.com/bhsd-harry/wikiparser-node/wiki/types-%28EN%29#linterror)

## v1.1.5

*2023-12-19*

**Fixed**

- Magic words `!` and `=` are now required in [parser configurations](./config/.schema.json)

## v1.1.4

*2023-12-18*

**Added**

- New methods [`AstText.prototype.escape`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstText-%28EN%29#escape), `ParameterToken.prototype.escape` and `MagicLinkToken.prototype.escape`

**Fixed**

- Removing unexpected `remove` and `insert` events dispatched by [`Token.prototype.safeReplaceWith`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#safereplacewith)
- `{{!}}` and `{{=}}` can be part of an external link now

**Changed**

- Inserting a child node is now forbidden

## v1.1.3

*2023-12-16*

**Fixed**

- Fixing [`Token.prototype.sections`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#sections) since [v1.1.2](#v112)

**Changed**

- [`Token.prototype.findEnclosingHtml`](https://github.com/bhsd-harry/wikiparser-node/wiki/Token-%28EN%29#findenclosinghtml) now returns an [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29) object

## v1.1.2

*2023-12-13*

**Changed**

- Token type `converter-rule-noconvert` now regarded as `converter-rule-to`
- Anonymous parameters will remain anonymous after [`ParameterToken.prototype.setValue`](https://github.com/bhsd-harry/wikiparser-node/wiki/ParameterToken-%28EN%29#setvalue)

**Removed**

- `HeadingToken.name` property

## v1.1.1

*2023-12-11*

**Changed**

- [`getAttr`](https://github.com/bhsd-harry/wikiparser-node/wiki/AttributesToken-%28EN%29#getAttr) as the preferred method for [attribute selector](https://github.com/bhsd-harry/wikiparser-node/wiki/Selector-%28EN%29#属性)

## v1.1.0

*2023-12-11*

**Added**

- New properties and methods for [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29) objects: `extension`, `toSubjectPage`, `toTalkPage`, `isTalkPage`, `toBasePage`, `toRootPage`

**Fixed**

- Wrapping the text after the last `</onlyinclude>` in a [`NoincludeToken`](https://github.com/bhsd-harry/wikiparser-node/wiki/NoincludeToken-%28EN%29)
- Replacing remaining spaces in [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title-%28EN%29#title) property with underscores
- [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29) now maintains its content after `insertNode`, `deleteContents`, `extractContents` and `cloneContents` methods

**Changed**

- `startContainer` and `endContainer` properties of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange-%28EN%29) must be siblings now

**Removed**

- `AstRange.prototype.intersectsNode` method

## v1.0.3

*2023-12-05*

First TypeScript version
