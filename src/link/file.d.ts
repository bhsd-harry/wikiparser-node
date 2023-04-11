import LinkToken = require('.');
import Token = require('..');
import ImageParameterToken = require('../imageParameter');
import Title = require('../../lib/title');

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
	/** @override */
	override cloneChildNodes(): [Token, ...ImageParameterToken[]];

	/** 图片链接 */
	override get link(): string | Title;
	override set link(arg: string|Title);

	/** 图片大小 */
	get size(): {
		width: string;
		height: string;
	};

	/** 图片宽度 */
	get width(): string;
	set width(arg: string);

	/** 图片高度 */
	get height(): string;
	set height(arg: string);

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

	/**
	 * 获取生效的指定图片参数
	 * @param key 参数名
	 */
	getArg(key: string): ImageParameterToken;

	/**
	 * 是否具有指定图片参数
	 * @param key 参数名
	 */
	hasArg(key: string): boolean;

	/**
	 * 移除指定图片参数
	 * @param key 参数名
	 */
	removeArg(key: string): void;

	/** 获取图片参数名 */
	getKeys(): string[];

	/**
	 * 获取指定的图片参数值
	 * @param key 参数名
	 */
	getValues(key: string): (string | true)[];

	/**
	 * 获取生效的指定图片参数值
	 * @param key 参数名
	 */
	getValue(key: string): string | true;

	/**
	 * 设置图片参数
	 * @param key 参数名
	 * @param value 参数值
	 * @throws `RangeError` 未定义的图片参数
	 * @throws `SyntaxError` 非法的参数
	 */
	setValue(key: string, value: string | boolean): void;
}

export = FileToken;
