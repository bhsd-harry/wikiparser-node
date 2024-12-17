'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');
const [
	json,
	ts,
] = config.overrides;

module.exports = {
	...config,
	extends: [
		...config.extends,
		'plugin:markdown/recommended-legacy',
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
			'self',
			'Range',
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
				'printed/*.json',
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
			files: 'wiki/*.md/**',
			globals: {
				assert: 'readonly',
				Parser: 'readonly',
			},
			rules: {
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
			files: '**/*.ts',
			excludedFiles: [
				'addon/*.ts',
				'bin/*.ts',
				'test/*.ts',
			],
			plugins: [
				'es-x',
			],
			rules: {
				'es-x/no-regexp-s-flag': 2,
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
