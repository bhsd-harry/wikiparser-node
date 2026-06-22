import type {TokenTypes} from './base';
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
	ImageParameterToken,
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
	'image-parameter': ImageParameterToken;
}
export type SelectedTokenTypes = keyof TokenTypeMap;

// Ensure all keys in TokenTypeMap are valid token types
declare type AssertTrue<T extends TokenTypes> = T;
declare type TokenTypeMapKeyCheck = AssertTrue<SelectedTokenTypes>;
