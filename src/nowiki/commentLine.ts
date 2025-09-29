import {NoincludeToken} from './noinclude';
import type {GalleryToken, ImagemapToken} from '../../internal';

/**
 * ignored line in certain extension tags
 *
 * 某些扩展标签内被忽略的行
 */
export abstract class CommentLineToken extends NoincludeToken {
	abstract override get parentNode(): GalleryToken | ImagemapToken | undefined;
}
