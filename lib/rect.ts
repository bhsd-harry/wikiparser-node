import type {AstNodes, Position} from './node';

/** 节点位置 */
export class BoundingRect {
	readonly #token: AstNodes;
	readonly #start: number;
	#pos: Position | undefined;

	/** 起点 */
	get start(): number {
		return this.#start;
	}

	/** 起点行 */
	get top(): number {
		return this.#getPosition().top;
	}

	/** 起点列 */
	get left(): number {
		return this.#getPosition().left;
	}

	/**
	 * @param token 节点
	 * @param start 起点
	 */
	constructor(token: AstNodes, start: number) {
		this.#token = token;
		this.#start = start;
	}

	/** 计算位置 */
	#getPosition(): Position {
		this.#pos ??= this.#token.getRootNode().posFromIndex(this.#start)!;
		return this.#pos;
	}
}
