import {
	jsDoc,
	node,
	extend,
} from '@bhsd/code-standard';
import markdown from 'eslint-plugin-markdown';

jsDoc.rules['jsdoc/require-jsdoc'][1].require = {
	ArrowFunctionExpression: true,
	ClassDeclaration: true,
	FunctionDeclaration: false,
	FunctionExpression: true,
	MethodDefinition: false,
};
node.at(-1).settings.n.allowModules = [
	'chalk',
	'monaco-editor',
];

export default extend(
	jsDoc,
	...node,
	...markdown.configs.recommended,
	{
		ignores: [
			'.cache/',
			'.nyc_output/',
			'coverage/',
			'bundle/',
			'errors/',
			'printed/',
			'test/parserTests.json',
			'**/*.md/*.ts',
		],
	},
	{
		rules: {
			'no-control-regex': 0,
			'no-bitwise': [
				2,
				{
					allow: [
						'<<',
					],
				},
			],
			'no-new': 0,
			'no-restricted-globals': [
				2,
				'escape',
				'close',
				'closed',
				'constructor',
				'length',
				'Location',
				'name',
				'open',
				'parent',
				'print',
				'Range',
				'self',
				'stop',
				'top',
			],
			'no-param-reassign': 0,
			'no-shadow': [
				2,
				{
					builtinGlobals: false,
				},
			],
			'prefer-object-has-own': 0,
			'@stylistic/max-len': [
				2,
				{
					ignoreRegExpLiterals: true,
					ignoreComments: true,
					code: 120,
				},
			],
			'n/no-unpublished-bin': 0,
			'unicorn/no-this-assignment': 0,
			'jsdoc/require-param-description': 0,
			'jsdoc/require-param': [
				1,
				{
					contexts: [
						'FunctionDeclaration',
						'VariableDeclarator > FunctionExpression',
						'MethodDefinition > FunctionExpression',
						'VariableDeclarator > ArrowFunctionExpression',
					],
					checkConstructors: false,
				},
			],
		},
	},
	{
		files: [
			'*.cjs',
			'*.mjs',
		],
		rules: {
			'@stylistic/array-bracket-newline': [
				2,
				{
					minItems: 1,
				},
			],
		},
	},
	{
		files: [
			'**/*.md/*.js',
		],
		languageOptions: {
			globals: {
				assert: 'readonly',
				Parser: 'readonly',
				wikiparse: 'readonly',
			},
		},
		rules: {
			'class-methods-use-this': 0,
			'no-undef': 2,
			'no-unused-expressions': 2,
			'no-unused-vars': [
				2,
				{
					varsIgnorePattern: '^Parser$',
				},
			],
			'no-var': 0,
			'jsdoc/require-jsdoc': 0,
			'n/no-missing-require': 0,
			'@stylistic/max-len': [
				2,
				{
					ignoreTemplateLiterals: true,
					code: 80,
				},
			],
			'@stylistic/quotes': [
				2,
				'single',
				{
					allowTemplateLiterals: 'always',
					avoidEscape: true,
				},
			],
		},
	},
	{
		files: [
			'**/*.ts',
		],
		rules: {
			'@typescript-eslint/class-methods-use-this': [
				2,
				{
					ignoreOverrideMethods: true,
					exceptMethods: [
						'createTextNode',
						'createRange',
						'fixed',
						'getGaps',
					],
				},
			],
			'@typescript-eslint/no-shadow': [
				2,
				{
					builtinGlobals: false,
				},
			],
			'@typescript-eslint/explicit-function-return-type': [
				2,
				{
					allowIIFEs: true,
					allowedNames: [
						'flagsParent',
						'magicLinkParent',
						'sol',
					],
				},
			],
			'@typescript-eslint/no-namespace': 0,
			'@typescript-eslint/no-require-imports': 0,
			'@typescript-eslint/no-unsafe-declaration-merging': 0,
			'@typescript-eslint/no-unsafe-function-type': 0,
			'@typescript-eslint/related-getter-setter-pairs': 0,
		},
	},
	{
		files: [
			'test/*.ts',
		],
		rules: {
			'n/no-missing-require': 0,
		},
	},
	{
		files: [
			'extensions/*.ts',
		],
		languageOptions: {
			parserOptions: {
				project: './extensions/tsconfig.json',
			},
		},
	},
);
