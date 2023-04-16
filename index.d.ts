import AstElement = require('./lib/element.js')
import AstNode = require('./lib/node.js')
import AstText = require('./lib/text.js')
import Title = require('./lib/title.js')
import ArgToken = require('./src/arg.js')
import HiddenToken = require('./src/atom/hidden.js')
import AtomToken = require('./src/atom/index.js')
import AttributeToken = require('./src/attribute.js')
import AttributesToken = require('./src/attributes.js')
import ConverterToken = require('./src/converter.js')
import ConverterFlagsToken = require('./src/converterFlags.js')
import ConverterRuleToken = require('./src/converterRule.js')
import ExtLinkToken = require('./src/extLink.js')
import GalleryToken = require('./src/gallery.js')
import HasNowikiToken = require('./src/hasNowiki/index.js')
import PreToken = require('./src/hasNowiki/pre.js')
import HeadingToken = require('./src/heading.js')
import HtmlToken = require('./src/html.js')
import ImageParameterToken = require('./src/imageParameter.js')
import ImagemapToken = require('./src/imagemap.js')
import ImagemapLinkToken = require('./src/imagemapLink.js')
import Token = require('./src/index.js')
import CategoryToken = require('./src/link/category.js')
import FileToken = require('./src/link/file.js')
import GalleryImageToken = require('./src/link/galleryImage.js')
import LinkToken = require('./src/link/index.js')
import MagicLinkToken = require('./src/magicLink.js')
import ChooseToken = require('./src/nested/choose.js')
import ComboboxToken = require('./src/nested/combobox.js')
import NestedToken = require('./src/nested/index.js')
import ReferencesToken = require('./src/nested/references.js')
import CommentToken = require('./src/nowiki/comment.js')
import DdToken = require('./src/nowiki/dd.js')
import DoubleUnderscoreToken = require('./src/nowiki/doubleUnderscore.js')
import HrToken = require('./src/nowiki/hr.js')
import NowikiToken = require('./src/nowiki/index.js')
import ListToken = require('./src/nowiki/list.js')
import NoincludeToken = require('./src/nowiki/noinclude.js')
import QuoteToken = require('./src/nowiki/quote.js')
import OnlyincludeToken = require('./src/onlyinclude.js')
import ParamTagToken = require('./src/paramTag/index.js')
import InputboxToken = require('./src/paramTag/inputbox.js')
import ParameterToken = require('./src/parameter.js')
import SyntaxToken = require('./src/syntax.js')
import TableToken = require('./src/table/index.js')
import TdToken = require('./src/table/td.js')
import TrToken = require('./src/table/tr.js')
import ExtToken = require('./src/tagPair/ext.js')
import IncludeToken = require('./src/tagPair/include.js')
import TagPairToken = require('./src/tagPair/index.js')
import TranscludeToken = require('./src/transclude.js')

declare interface ParserConfig {
	ext: string[];
	html: [string[], string[], string[]];
	namespaces: Record<string, string>;
	nsid: Record<string, number>;
	parserFunction: [Record<string, string>, string[], string[], string[]];
	doubleUnderscore: [string[], string[]];
	protocol: string;
	img: Record<string, string>;
	variants: string[];
	interwiki?: string[];
	excludes?: string[];
}

declare interface LintError {
	message: string;
	severity: 'error'|'warning';
	startIndex: number;
	endIndex: number;
	startLine: number;
	startCol: number;
	endLine: number;
	endCol: number;
	excerpt: string;
}

declare interface Parser {
	config: ParserConfig;
	minConfig: ParserConfig;
	i18n?: Record<string, string>;

	readonly MAX_STAGE: number;

	/** 获取设置 */
	getConfig(): ParserConfig;

	/**
	 * 生成I18N消息
	 * @param msg 消息名
	 * @param arg 额外参数
	 */
	msg(msg: string, arg?: string): string;

	/**
	 * 规范化页面标题
	 * @param title 标题（含或不含命名空间前缀）
	 * @param defaultNs 命名空间
	 * @param include 是否嵌入
	 * @param halfParsed 是否是半解析状态
	 * @param decode 是否需要解码
	 * @param selfLink 是否允许selfLink
	 */
	normalizeTitle(
		title: string,
		defaultNs?: number,
		include?: boolean,
		config?: ParserConfig,
		halfParsed?: boolean,
		decode?: boolean,
		selfLink?: boolean,
	): Title;

	/**
	 * 解析wikitext
	 * @param include 是否嵌入
	 * @param maxStage 最大解析层级
	 */
	parse(wikitext: string, include?: boolean, maxStage?: number, config?: ParserConfig): Token;

	run<T>(callback: () => T): T;
}

declare const Parser: Parser;

declare namespace Parser {
	export {
		ParserConfig,
		LintError,
		AstElement,
		AstNode,
		AstText,
		Title,
		ArgToken,
		HiddenToken,
		AtomToken,
		AttributeToken,
		AttributesToken,
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
	};
}

export = Parser;
