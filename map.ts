import type {
	OnlyincludeToken,
	IncludeToken,
	CommentToken,
	ExtToken,
	AttributesToken,
	AttributeToken,
	AtomToken,
	ArgToken,
	TranscludeToken,
	ParameterToken,
	HeadingToken,
	HiddenToken,
} from './internal';

export interface TokenTypeMap {
	onlyinclude: OnlyincludeToken;
	include: IncludeToken;
	comment: CommentToken;
	ext: ExtToken;
	'ext-attrs': AttributesToken;
	'ext-attr': AttributeToken;
	arg: ArgToken;
	'arg-name': AtomToken;
	hidden: HiddenToken;
	'magic-word': TranscludeToken;
	template: TranscludeToken;
	'template-name': AtomToken;
	parameter: ParameterToken;
	heading: HeadingToken;
}
export type SelectedTokenTypes = keyof TokenTypeMap;
