# PHP解析器的步骤

## 解析阶段

<ol start="-2">
<li>
替换签名和 <code>{{subst:}}</code> ，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L4702">Parser::pstPass2</a>
；这在版本历史中不可能保留，可以跳过。
</li><li>
移除特定字符 <code>\0</code> 和 <code>\x7F</code>，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L597">Parser::parse</a>
</li><li>
重定向，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Content/WikitextContentHandler.php#L280">WikitextContentHandler::extractRedirectTargetAndText</a>
</li><li>
注释/扩展标签（<code><</code> 相关），参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Preprocessor_Hash.php#L155">Preprocessor_Hash::buildDomTreeArrayFromText</a>
和
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Sanitizer.php#L1129">Sanitizer::decodeTagAttributes</a>
</li><li>
模板/模板变量/标题，注意最右侧法则，以及 <code>-{</code> 和 <code>[[</code> 可以破坏 <code>{{</code> 或
<code>{{{</code> 语法，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Preprocessor_Hash.php#L155">Preprocessor_Hash::buildDomTreeArrayFromText</a>
</li><li>
HTML 标签（允许不匹配），参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Sanitizer.php#L319">Sanitizer::internalRemoveHtmlTags</a>
</li><li>
表格，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L1280">Parser::handleTables</a>
</li><li>
水平线、状态开关和余下的标题，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L1490">Parser::internalParse</a>
</li><li>
内链，含文件和分类，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L2395">Parser::handleInternalLinks2</a>
</li><li>
<code>'</code>，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L1923">Parser::doQuotes</a>
</li><li>
外链，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L2108">Parser::handleExternalLinks</a>
</li><li>
ISBN、RFC 和自由外链，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/Parser.php#L1689">Parser::handleMagicLinks</a>
</li><li>
段落和列表，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Parser/BlockLevelPass.php#L189">BlockLevelPass::execute</a>
</li><li>
转换，参见
<a href="https://github.com/wikimedia/mediawiki/blob/wmf/1.47.0-wmf.24/includes/Language/LanguageConverter.php#L938">LanguageConverter::recursiveConvertRule</a>
</li>
</ol>

## 节点标记

节点以 `\0\d+.\x7F` 的形式标记。

### 节点类型

|标记字符|节点类型|
|:-:|:-:|
|`!`|`{{!}}` 专用|
|`{`|`{{(!}}` 专用|
|`}`|`{{!)}}` 专用|
|`-`|`{{!-}}` 专用|
|`+`|`{{!!}}` 专用|
|`~`|`{{=}}` 专用|
|`a`|AttributeToken|
|`b`|TableToken|
|`c`|CommentToke|
|`d`|ListToken|
|`e`|ExtToken|
|`f`|ImageParameterToken 内的 MagicLinkToken|
|`g`|TranslateToken 或 OnlyincludeToken|
|`h`|HeadingToken|
|`i`|RFC/PMID/ISBN|
|`l`|LinkToken|
|`m`|`{{server}}`、`{{fullurl:}}`、`{{canonicalurl:}}` 或 `{{filepath:}}`|
|`n`|NoIncludeToken、IncludeToken、TvarToken、DoubleUnderscoreToken 或 `{{#vardefine:}}`|
|`o`|RedirectToken|
|`q`|QuoteToken|
|`r`|HrToken|
|`s`|`{{{\|subst:}}}`|
|`t`|ArgToken 或 TranscludeToken|
|`u`|`__TOC__`|
|`v`|ConverterToken|
|`w`|ExtLinkToken 或 free-ext-link|
|`x`|HtmlToken|
