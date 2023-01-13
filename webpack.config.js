// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path'),
	{ESBuildMinifyPlugin} = require('esbuild-loader');

// const mode = 'development';
const mode = 'production';

const config = {
	entry: './index.js',
	output: {
		path: path.resolve(__dirname, 'bundle'),
		filename: `bundle.${mode === 'production' ? 'min.' : ''}js`,
		iife: true,
	},
	plugins: [],
	module: {
		rules: [],
	},
	optimization: {
		minimize: mode === 'production',
		minimizer: [
			new ESBuildMinifyPlugin({
				target: 'es2018',
			}),
		],
	},
	mode,
};

module.exports = config;
