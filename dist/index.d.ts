import AstElement = require("./lib/element.js")
import AstNode = require("./lib/node.js")
import Ranges = require("./lib/ranges.js")
import AstText = require("./lib/text.js")
import Title = require("./lib/title.js")
import ArgToken = require("./src/arg.js")
import HiddenToken = require("./src/atom/hidden.js")
import AtomToken = require("./src/atom/index.js")
import AttributeToken = require("./src/attribute.js")
import AttributesToken = require("./src/attributes.js")
import CharinsertToken = require("./src/charinsert.js")
import ConverterToken = require("./src/converter.js")
import ConverterFlagsToken = require("./src/converterFlags.js")
import ConverterRuleToken = require("./src/converterRule.js")
import ExtLinkToken = require("./src/extLink.js")
import GalleryToken = require("./src/gallery.js")
import HasNowikiToken = require("./src/hasNowiki/index.js")
import PreToken = require("./src/hasNowiki/pre.js")
import HeadingToken = require("./src/heading.js")
import HtmlToken = require("./src/html.js")
import ImageParameterToken = require("./src/imageParameter.js")
import ImagemapToken = require("./src/imagemap.js")
import ImagemapLinkToken = require("./src/imagemapLink.js")
import Token = require("./src/index.js")
import CategoryToken = require("./src/link/category.js")
import FileToken = require("./src/link/file.js")
import GalleryImageToken = require("./src/link/galleryImage.js")
import LinkToken = require("./src/link/index.js")
import MagicLinkToken = require("./src/magicLink.js")
import ChooseToken = require("./src/nested/choose.js")
import ComboboxToken = require("./src/nested/combobox.js")
import NestedToken = require("./src/nested/index.js")
import ReferencesToken = require("./src/nested/references.js")
import CommentToken = require("./src/nowiki/comment.js")
import DdToken = require("./src/nowiki/dd.js")
import DoubleUnderscoreToken = require("./src/nowiki/doubleUnderscore.js")
import HrToken = require("./src/nowiki/hr.js")
import NowikiToken = require("./src/nowiki/index.js")
import ListToken = require("./src/nowiki/list.js")
import NoincludeToken = require("./src/nowiki/noinclude.js")
import QuoteToken = require("./src/nowiki/quote.js")
import OnlyincludeToken = require("./src/onlyinclude.js")
import ParamTagToken = require("./src/paramTag/index.js")
import InputboxToken = require("./src/paramTag/inputbox.js")
import ParameterToken = require("./src/parameter.js")
import SyntaxToken = require("./src/syntax.js")
import TableToken = require("./src/table/index.js")
import TdToken = require("./src/table/td.js")
import TrToken = require("./src/table/tr.js")
import ExtToken = require("./src/tagPair/ext.js")
import IncludeToken = require("./src/tagPair/include.js")
import TagPairToken = require("./src/tagPair/index.js")
import TranscludeToken = require("./src/transclude.js")

export = Parser;
declare const Parser: import('./../typings');

declare namespace Parser {
	export {
		AstElement,
		AstNode,
		Ranges,
		AstText,
		Title,
		ArgToken,
		HiddenToken,
		AtomToken,
		AttributeToken,
		AttributesToken,
		CharinsertToken,
		ConverterToken,
		ConverterFlagsToken,
		ConverterRuleToken,
		ExtLinkToken,
		GalleryToken,
		HasNowikiToken,
		PreToken,
		HeadingToken,
		HtmlToken,
		ImageParameterToken,
		ImagemapToken,
		ImagemapLinkToken,
		Token,
		CategoryToken,
		FileToken,
		GalleryImageToken,
		LinkToken,
		MagicLinkToken,
		ChooseToken,
		ComboboxToken,
		NestedToken,
		ReferencesToken,
		CommentToken,
		DdToken,
		DoubleUnderscoreToken,
		HrToken,
		NowikiToken,
		ListToken,
		NoincludeToken,
		QuoteToken,
		OnlyincludeToken,
		ParamTagToken,
		InputboxToken,
		ParameterToken,
		SyntaxToken,
		TableToken,
		TdToken,
		TrToken,
		ExtToken,
		IncludeToken,
		TagPairToken,
		TranscludeToken,
	}
}