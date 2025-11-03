import {pathToFileURL} from 'url';
import path from 'path';

declare type Resolve = (specifier: string, context: unknown, defaultResolve: Resolve) => {url: string};

export const resolve: Resolve = (specifier, context, defaultResolve) => specifier === 'stylelint'
	? {url: pathToFileURL(path.join(__dirname, 'stylelint.js')).toString()}
	: defaultResolve(specifier, context, defaultResolve);
