// Generated using webpack-cli https://github.com/webpack/webpack-cli
/* eslint n/exports-style: [2, "module.exports"] */
'use strict';

const path = require('path'),
	{EsbuildPlugin} = require('esbuild-loader');

const output = {
		path: path.resolve(__dirname, 'bundle'),
		filename: 'bundle.js',
		iife: true,
	},
	config = {
		entry: './index.ts',
		output,
		resolve: {
			extensions: ['.ts', '.json'],
		},
		plugins: [],
		module: {
			rules: [
				{
					test: /\.ts$/u,
					loader: 'esbuild-loader',
					options: {
						target: 'es2018',
					},
				},
			],
		},
	};

module.exports = /** @implements */ (_, {mode}) => {
	config.mode = mode;
	if (mode === 'production') {
		output.filename = 'bundle.min.js';
		config.optimization = {
			minimize: true,
			minimizer: [
				new EsbuildPlugin({
					target: 'es2018',
					format: 'iife',
				}),
			],
		};
	}

	return config;
};
