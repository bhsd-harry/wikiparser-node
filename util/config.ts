import {
	getParserConfig,
	getConfig,
	getVariants,

	/* NOT FOR BROWSER */

	getKeywords,
} from '@bhsd/cm-util';
import {toLowerCase} from './string';
import type {MwConfig, MagicWord} from '@bhsd/cm-util';
import type {ConfigData} from '../base';

declare interface Response {
	query: {
		general: {
			articlepath: string;
			server: string;
			langconversion: boolean;
			variants?: {code: string}[];
			case: 'first-letter' | 'case-sensitive';
		};
		magicwords: MagicWord[];
		namespaces: Record<number, {name: string, canonical?: string}>;
		namespacealiases: {id: number, alias: string}[];
		functionhooks?: string[];
		variables: string[];
	};
}

/**
 * Gets the aliases of magic words.
 * @param magicwords magic words
 * @param targets magic word names
 */
const getAliases = (magicwords: MagicWord[], targets: Set<string>): string[] => magicwords
	.filter(({name}) => targets.has(name))
	.flatMap(({aliases}) => aliases.map(s => s.replace(/:$/u, '').toLowerCase()));

/**
 * Filters out gadget-related namespaces.
 * @param id namespace ID
 */
const filterGadget = (id: string | number): boolean => {
	const n = Number(id);
	return n < 2300 || n > 2303; // Gadget, Gadget talk, Gadget definition, Gadget definition talk
};

/**
 * 使用 MediaWiki API 补全解析设置
 * @param minConfig 最小配置
 * @param mwConfig MediaWiki CodeMirror 设置
 * @param url MediaWiki Script 路径
 * @param headers 请求头
 */
export default async (
	minConfig: ConfigData,
	mwConfig: MwConfig,
	url: string,
	headers?: RequestInit,
): Promise<ConfigData> => {
	const params = {
			action: 'query',
			meta: 'siteinfo',
			siprop: `general|magicwords|namespaces|namespacealiases${mwConfig.functionHooks ? '' : '|functionhooks'}`,
			format: 'json',
			formatversion: '2',
		},
		{
			general: {articlepath, server, variants, langconversion, case: capitalLinks},
			magicwords,
			namespaces,
			namespacealiases,

			/* NOT FOR BROWSER */

			functionhooks,
		} = (await (
			await fetch(`${url}/api.php?${String(new URLSearchParams(params))}`, headers)
		).json() as Response).query,
		ns = Object.entries(namespaces).filter(([id]) => filterGadget(id))
			.flatMap(([id, {name, canonical = ''}]): (readonly [string, string])[] => [
				[id, name],
				...name === canonical ? [] : [[id, canonical] as const],
			]),
		config: ConfigData = {
			...getParserConfig(minConfig, mwConfig),
			variants: langconversion ? getVariants(variants) : [],
			namespaces: Object.fromEntries(ns),
			nsid: Object.fromEntries([
				...ns.map(([id, canonical]) => [canonical.toLowerCase(), Number(id)]),
				...namespacealiases.filter(({id}) => filterGadget(id)).map(({id, alias}) => [alias.toLowerCase(), id]),
			]),
			articlePath: articlepath,
			server,
			...capitalLinks === 'case-sensitive' && {capitalLinks: false},

			/* NOT FOR BROWSER */

			...!(mwConfig.imageKeywords && mwConfig.redirection) && getKeywords(magicwords),
		},
		{doubleUnderscore, parserFunction} = config;
	doubleUnderscore[0] = [];
	doubleUnderscore[1] = [];
	Object.assign(parserFunction[0], getConfig(magicwords, ({name}) => name === 'msgnw'));
	parserFunction[2] = getAliases(magicwords, new Set(['msg', 'raw']));
	parserFunction[3] = getAliases(magicwords, new Set(['subst', 'safesubst']));
	if ('#choose' in parserFunction[0]) {
		delete parserFunction[0]['choose'];
		const i = config.variable.indexOf('choose');
		if (i !== -1) {
			config.variable.splice(i, 1);
		}
	}

	/* NOT FOR BROWSER */

	if (!mwConfig.functionHooks) {
		config.functionHook = [...toLowerCase(functionhooks!), 'msgnw'];
	}
	if (!mwConfig.variableIDs) {
		const {variables} = (await (
			await fetch(
				`${url}/api.php?${String(new URLSearchParams({...params, siprop: 'variables'}))}`,
				headers,
			)
		).json() as Response).query;
		config.variable = [...new Set([...variables, '='])];
	}

	/* NOT FOR BROWSER */

	return config;
};
