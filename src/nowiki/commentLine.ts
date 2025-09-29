import {NoincludeToken} from './noinclude';
import type {GalleryToken, ImagemapToken} from '../../internal';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {singleLine} from '../../mixin/singleLine';

/* NOT FOR BROWSER END */

/**
 * ignored line in certain extension tags
 *
 * 某些扩展标签内被忽略的行
 */
@singleLine
export abstract class CommentLineToken extends NoincludeToken {
	abstract override get parentNode(): GalleryToken | ImagemapToken | undefined;

	/* NOT FOR BROWSER */

	abstract override get parentElement(): GalleryToken | ImagemapToken | undefined;
}

classes['CommentLineToken'] = __filename;
