import {pathToFileURL} from 'url';
import path from 'path';
import type {ResolveHookSync} from 'module';

export const resolve: ResolveHookSync = (specifier, context, defaultResolve) => specifier === 'stylelint'
	? {url: String(pathToFileURL(path.join(__dirname, 'stylelint.js')))}
	: defaultResolve(specifier, context);
