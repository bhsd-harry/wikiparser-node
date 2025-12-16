import {
	jsDoc,
	node,
	browser,
	extend,
} from '@bhsd/code-standard';

const [
	,
	options,
] = jsDoc.rules['jsdoc/require-jsdoc'];
options.require = {
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
	{
		ignores: [
			'.cache/',
			'.nyc_output/',
			'coverage/',
			'bundle/',
			'errors/',
			'wiki/',
			'test/parserTests.json',
		],
	},
	{
		rules: {
			'no-control-regex': 0,
			'no-unused-vars': [
				2,
				{
					args: 'none',
					caughtErrors: 'all',
					ignoreRestSiblings: true,
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
			'no-unused-labels': 0,
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
			'unicorn/empty-brace-spaces': 0,
			'unicorn/prefer-global-this': 0,
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
			'**/*.ts',
		],
		rules: {
			'@typescript-eslint/class-methods-use-this': [
				2,
				{
					ignoreOverrideMethods: true,
					exceptMethods: [
						'escape',
						'getGaps',
						'provideColorPresentations',
						'provideCodeAction',
					],
				},
			],
			'@typescript-eslint/no-shadow': [
				2,
				{
					builtinGlobals: false,
				},
			],
			'@typescript-eslint/no-unused-vars': [
				2,
				{
					args: 'none',
					caughtErrors: 'all',
					ignoreRestSiblings: true,
				},
			],
			'@typescript-eslint/no-namespace': 0,
			'@typescript-eslint/no-require-imports': 0,
			'@typescript-eslint/no-unsafe-declaration-merging': 0,
			'@typescript-eslint/no-unsafe-function-type': 0,
		},
	},
	{
		files: [
			'mixin/*.ts',
		],
		rules: {
			'jsdoc/require-jsdoc': 0,
		},
	},
	{
		files: [
			'test/*.ts',
		],
		rules: {
			'n/no-missing-require': 0,
			'n/no-unsupported-features/node-builtins': [
				2,
				{
					allowExperimental: true,
					version: '>=24.0.0',
				},
			],
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
		rules: {
			'no-control-regex': 2,
			'no-new': 2,
			'no-param-reassign': 2,
			'unicorn/no-this-assignment': 2,
			'unicorn/empty-brace-spaces': 2,
			'n/no-missing-import': 0,
			'n/no-unsupported-features/node-builtins': 0,
			'@typescript-eslint/no-unused-vars': [
				2,
				{
					args: 'all',
					caughtErrors: 'all',
					ignoreRestSiblings: true,
				},
			],
			'@typescript-eslint/no-floating-promises': 0,
		},
	},
	{
		files: [
			'extensions/gh-page.ts',
			'extensions/test-page.ts',
			'extensions/test-page-common.ts',
			'extensions/codejar.ts',
		],
		languageOptions: {
			parserOptions: {
				project: './extensions/tsconfig.codejar.json',
			},
		},
	},
	{
		files: [
			'**/*.ts',
		],
		ignores: [
			'test/*.ts',
		],
		...browser,
	},
);
