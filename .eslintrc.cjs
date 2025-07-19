'use strict';

const config = require('@bhsd/code-standard/eslintrc.node.cjs');
const [
	json,
	ts,
] = config.overrides;

module.exports = {
	...config,
	ignorePatterns: [
		...config.ignorePatterns,
		'coverage/',
		'/bundle/',
		'/wiki/',
	],
	rules: {
		...config.rules,
		'no-control-regex': 0,
		'no-unused-vars': [
			2,
			{
				args: 'none',
				caughtErrors: 'all',
				ignoreRestSiblings: true,
			},
		],
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
		'n/exports-style': [
			2,
			'exports',
		],
		'n/no-unpublished-bin': 0,
		'unicorn/no-this-assignment': 0,
		'unicorn/empty-brace-spaces': 0,
		'jsdoc/require-jsdoc': [
			1,
			{
				...config.rules['jsdoc/require-jsdoc'][1],
				require: {
					ArrowFunctionExpression: true,
					ClassDeclaration: true,
					FunctionDeclaration: false,
					FunctionExpression: true,
					MethodDefinition: false,
				},
			},
		],
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
	overrides: [
		{
			...json,
			excludedFiles: [
				'test/parserTests.json',
			],
		},
		{
			files: [
				'errors/*.json',
			],
			rules: {
				'@stylistic/eol-last': [
					2,
					'never',
				],
				'@stylistic/indent': 0,
			},
		},
		{
			...ts,
			rules: {
				...ts.rules,
				'@typescript-eslint/class-methods-use-this': [
					2,
					{
						ignoreOverrideMethods: true,
						exceptMethods: [
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
			files: '*.cjs',
			rules: {
				'n/exports-style': [
					2,
					'module.exports',
				],
				'@stylistic/array-bracket-newline': [
					2,
					{
						minItems: 1,
					},
				],
			},
		},
	],
	settings: {
		...config.settings,
		n: {
			...config.settings.n,
			allowModules: [
				'chalk',
			],
		},
	},
};
