import type {Token} from '../internal';

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
			data.removed!.setAttribute('parentNode', target as Token);
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
				target.replaceData(data.oldText!);
			}
			break;
		default:
			throw new RangeError(`无法撤销未知类型的事件：${String(type)}`);
	}
};
