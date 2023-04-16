import LinkToken = require('.');
import Token = require('..');
import ImageParameterToken = require('../imageParameter');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
declare class FileToken extends LinkToken {
	override type: 'file'|'gallery-image'|'imagemap-image';
	override childNodes: [Token, ...ImageParameterToken[]];
	/** @override */
	override get firstChild(): Token;
	/** @override */
	override get lastChild(): Token;

	/** 获取所有图片参数节点 */
	getAllArgs(): ImageParameterToken[];

	/**
	 * 获取指定图片参数
	 * @param key 参数名
	 */
	getArgs(key: string): ImageParameterToken[];

	/** 获取图片框架属性参数节点 */
	getFrameArgs(): ImageParameterToken[];

	/** 获取图片水平对齐参数节点 */
	getHorizAlignArgs(): ImageParameterToken[];

	/** 获取图片垂直对齐参数节点 */
	getVertAlignArgs(): ImageParameterToken[];
}

export = FileToken;
