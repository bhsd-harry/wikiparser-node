'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs'),
	{rules} = require('@bhsd/common/eslintrc.browser.cjs');
const [
		json,
		ts,
	] = config.overrides,
	// eslint-disable-next-line @stylistic/array-bracket-newline
	esRules = Object.fromEntries(Object.entries(rules).filter(([k]) => k.startsWith('es-x/')));

module.exports = {
	...config,
	env: {
		...config.env,
		browser: true,
	},
	ignorePatterns: [
		...config.ignorePatterns,
		'coverage/',
		'/bundle/',
		'/extensions/es7/',
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
				ignoreComments: true,
				code: 120,
			},
		],
		'n/exports-style': [
			2,
			'exports',
		],
		'unicorn/no-this-assignment': 0,
		'unicorn/empty-brace-spaces': 0,
		'unicorn/prefer-global-this': 0,
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
			files: '**/*.ts',
			excludedFiles: [
				'test/*.ts',
				'lib/lsp.ts',
				'extensions/gh-page.ts',
				'extensions/codejar.ts',
			],
			plugins: [
				'es-x',
			],
			rules: {
				'es-x/no-array-prototype-flat': 2,
				'es-x/no-global-this': 2,
				'es-x/no-malformed-template-literals': 2,
				'es-x/no-regexp-s-flag': 2,
				'es-x/no-regexp-unicode-property-escapes': 2,
				'es-x/no-string-prototype-trimstart-trimend': 2,
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
				...esRules,
				'no-control-regex': 2,
				'no-bitwise': 2,
				'no-new': 2,
				'no-param-reassign': 2,
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
