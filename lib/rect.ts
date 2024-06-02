import type {AstNodes, Position} from './node';

/** 节点位置 */
export class BoundingRect {
	#pos: Position | undefined;
	readonly token: AstNodes;
	readonly start: number;

	/** 起点行 */
	get top(): number {
		this.#pos ??= this.getPosition();
		return this.#pos.top;
	}

	/** 起点列 */
	get left(): number {
		this.#pos ??= this.getPosition();
		return this.#pos.left;
	}

	/**
	 * @param token 节点
	 * @param start 起点
	 */
	constructor(token: AstNodes, start: number) {
		this.token = token;
		this.start = start;
	}

	/** 计算位置 */
	getPosition(): Position {
		return this.token.getRootNode().posFromIndex(this.start)!;
	}
}
