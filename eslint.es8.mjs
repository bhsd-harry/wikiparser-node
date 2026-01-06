import {dist} from '@bhsd/code-standard';
import esX from 'eslint-plugin-es-x';

export default [
	dist,
	{
		rules: {
			...esX.configs['flat/restrict-to-es2017'].rules,
			'es-x/no-array-prototype-at': 0,
			'es-x/no-global-this': 0,
			'es-x/no-iterator-prototype-filter': 0,
			'es-x/no-iterator-prototype-find': 0,
			'es-x/no-iterator-prototype-map': 0,
			'es-x/no-iterator-prototype-some': 0,
			'es-x/no-regexp-unicode-property-escapes': 0,
			'es-x/no-string-prototype-at': 0,
		},
	},
];
