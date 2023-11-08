/**
 * 定制TypeError消息
 * @param {Function} Constructor 类
 * @param args 可接受的参数类型
 * @throws `TypeError`
 */
export const typeError = ({name}: Function, method: string, ...args: string[]): never => {
	throw new TypeError(`${name}.${method} 方法仅接受 ${args.join('、')} 作为输入参数！`);
};

/**
 * 撤销最近一次Mutation
 * @param e 事件
 * @param data 事件数据
 * @throws `RangeError` 无法撤销的事件类型
 */
export const undo = (e: AstEvent, data: AstEventData): void => {
	const {target, type} = e;
	switch (type) {
		case 'remove': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position!, 0, data.removed!);
			data.removed!.setAttribute('parentNode', target as import('../src'));
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'insert': {
			const childNodes = [...target.childNodes];
			childNodes.splice(data.position!, 1);
			target.setAttribute('childNodes', childNodes);
			break;
		}
		case 'replace': {
			const {parentNode} = target,
				childNodes = [...parentNode!.childNodes];
			childNodes.splice(data.position!, 1, data.oldToken!);
			data.oldToken!.setAttribute('parentNode', parentNode);
			parentNode!.setAttribute('childNodes', childNodes);
			break;
		}
		case 'text':
			if (target.type === 'text') {
				target.replaceData(data.oldText);
			}
			break;
		default:
			throw new RangeError(`无法撤销未知类型的事件：${type as string}`);
	}
};
