// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {TranscludeToken} from '../src/transclude';

/**
 * 调整最后一个子节点的换行符
 * @param token 魔术字或模板节点
 */
const format = (token: TranscludeToken): void => {
	const {lastChild, type} = token,
		isParameter = lastChild.type === 'parameter';
	if (
		!(
			type === 'template'
				? isParameter && lastChild.anon
				: lastChild.type === 'magic-word-name'
		)
		&& !lastChild.toString().endsWith('\n')
	) {
		(isParameter ? lastChild.lastChild : lastChild).insertAt('\n');
	}
};

export {format};
