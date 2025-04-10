import type {Parser as ParserBase, Config} from '../base';

/**
 * 添加Extension:Translate相关设置
 * @param Parser 解析器
 */
export const getConfig = (Parser: ParserBase): Config => {
	const config = Parser.getConfig();
	config.ext.push('languages', 'translate', 'tvar');
	config.functionHook.push('translation');
	config.variable.push('translatablepage');
	config.parserFunction[0]['#translation'] = 'translation';
	(config.parserFunction[1] as Record<string, string>)['TRANSLATABLEPAGE'] = 'translatablepage';
	return config;
};
