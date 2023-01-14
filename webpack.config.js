// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path'),
	{ESBuildMinifyPlugin} = require('esbuild-loader');

// const mode = 'development';
const mode = 'production';

const config = mode === 'production'
	? {
		entry: './index.js',
		output: {
			path: path.resolve(__dirname, 'bundle'),
			filename: `bundle.min.js`,
			iife: true,
		},
		plugins: [],
		module: {
			rules: [],
		},
		optimization: {
			minimize: true,
			minimizer: [
				new ESBuildMinifyPlugin({
					target: 'es2018',
					format: 'iife',
				}),
			],
		},
		mode,
	}
	: {
		entry: './index.js',
		output: {
			path: path.resolve(__dirname, 'bundle'),
			filename: `bundle.js`,
			iife: true,
		},
		plugins: [],
		module: {
			rules: [{
				test: /\.js$/,
				loader: 'esbuild-loader',
				options: {
					target: 'es2018',
				},
			}],
		},
		mode,
	};

module.exports = config;
