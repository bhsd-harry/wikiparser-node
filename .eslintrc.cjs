'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');
const [
	json,
	ts,
] = config.overrides;

module.exports = {
	...config,
	env: {
		...config.env,
		browser: true,
	},
	ignorePatterns: [
		...config.ignorePatterns,
		'/wiki/',
		'/bundle/',
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
			'print',
			'escape',
			'close',
			'closed',
			'constructor',
			'length',
			'name',
			'open',
			'parent',
			'root',
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
		{
			files: 'extensions/*.ts',
			plugins: [
				'es-x',
			],
			parserOptions: {
				project: './extensions/tsconfig.json',
			},
			rules: {
				'no-control-regex': 2,
				'no-bitwise': 2,
				'no-new': 2,
				'no-param-reassign': 2,
				'es-x/no-array-prototype-at': 2,
				'es-x/no-global-this': 2,
				'es-x/no-object-fromentries': 2,
				'es-x/no-object-hasown': 2,
				'es-x/no-regexp-lookbehind-assertions': 2,
				'es-x/no-string-prototype-at': 2,
				'es-x/no-string-prototype-matchall': 2,
				'es-x/no-string-prototype-replaceall': 2,
				'unicorn/empty-brace-spaces': 2,
				'unicorn/no-this-assignment': 2,
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
				'extensions/codejar.ts',
			],
			parserOptions: {
				project: './extensions/tsconfig.codejar.json',
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
		'es-x': {
			aggressive: true,
		},
	},
};
