import FileToken = require('./file');

/**
 * 图片
 * @classdesc `{childNodes: [AtomToken, ...ImageParameterToken]}`
 */
declare class GalleryImageToken extends FileToken {
	override type: 'gallery-image'|'imagemap-image';
}

export = GalleryImageToken;
