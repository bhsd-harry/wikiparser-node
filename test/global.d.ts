import type {Parser as ParserBase} from '../base';

declare global {
	module '../../bundle/*' {
		const Parser: ParserBase;
		export default Parser;
	}
}
