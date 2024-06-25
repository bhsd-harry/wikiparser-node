import {classes} from '../../util/constants';
import {sol} from '../../mixin/sol';
import {ListBaseToken} from './listBase';

/** 位于行首的`;:*#` */
@sol
export abstract class ListToken extends ListBaseToken {
	override get type(): 'list' {
		return 'list';
	}
}

classes['ListToken'] = __filename;
