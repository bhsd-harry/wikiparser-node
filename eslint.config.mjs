import {
	jsDoc,
	node,
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
			'n/no-unsupported-features/node-builtins': [
				2,
				{
					allowExperimental: true,
					ignores: [
						'util.styleText',
					],
				},
			],
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
			'test/hooks.ts',
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
);
