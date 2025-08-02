import {error} from '../util/diff';
import Parser from '../../bundle/bundle.min.js'; // eslint-disable-line n/no-missing-import
import type {SimplePage} from '@bhsd/test-util';

Parser.config = require('../../config/default');

/**
 * 测试单个页面
 * @param page 页面
 * @param page.title 页面标题
 * @param page.ns 页面命名空间
 * @param page.content 页面源代码
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export default ({title, ns, content}: SimplePage): void => {
	content = content.replace(/[\0\x7F]|\r$/gmu, '');
	const include = ns === 10 || title.endsWith('/doc');

	console.time(`parse: ${title}`);
	const token = Parser.parse(content, include);
	console.timeEnd(`parse: ${title}`);
	const parsed = token.toString();
	if (parsed !== content) {
		error('解析过程中不可逆地修改了原始文本！');
	}
};
