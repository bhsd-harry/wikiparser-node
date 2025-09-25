import {NoincludeToken} from './noinclude';

/* NOT FOR BROWSER */

import {classes} from '../../util/constants';
import {singleLine} from '../../mixin/singleLine';

/* NOT FOR BROWSER END */

/**
 * ignored line in certain extension tags
 *
 * 某些扩展标签内被忽略的行
 */
@singleLine()
export abstract class CommentLineToken extends NoincludeToken {}

classes['CommentLineToken'] = __filename;
