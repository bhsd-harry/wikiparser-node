import {pathToFileURL} from 'url';
import path from 'path';
import type {ResolveHookSync} from 'module';

export const resolve: ResolveHookSync = (specifier, context, defaultResolve) => specifier === 'stylelint'
	? {url: pathToFileURL(path.join(__dirname, 'stylelint.js')).toString()}
	: defaultResolve(specifier, context);
