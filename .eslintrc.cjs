/* eslint n/exports-style: [2, 'module.exports'] */
/* eslint @stylistic/array-bracket-newline: [2, {minItems: 1}] */
/* eslint-disable @stylistic/max-len */
'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');
const [
	json,
	ts,
] = config.overrides;

module.exports = {
	...config,
	ignorePatterns: [
		...config.ignorePatterns,
		'/wiki/',
		'/bundle/',
	],
	rules: {
		...config.rules,
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
			'close',
			'closed',
			'constructor',
			'escape',
			'length',
			'name',
			'open',
			'parent',
			'print',
			'root',
			'stop',
			'top',
			'Request',
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
				code: 120,
			},
		],
		'n/exports-style': [
			2,
			'exports',
		],
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
				'@typescript-eslint/no-namespace': 0,
				'@typescript-eslint/no-unsafe-declaration-merging': 0,
			},
		},
		{
			files: [
				'test/*.ts',
			],
			rules: {
				'n/no-missing-import': 0,
				'n/no-missing-require': 0,
			},
		},
		{
			files: 'extensions/*.ts',
			parserOptions: {
				project: './extensions/tsconfig.json',
			},
		},
	],
	settings: {
		...config.settings,
		n: {
			...config.settings.n,
			allowModules: [
				'chalk',
				'monaco-editor',
			],
		},
	},
};
