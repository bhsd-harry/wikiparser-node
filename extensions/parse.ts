/* eslint-disable jsdoc/require-jsdoc */
import type {ExtendedAST, AST, TokenTypes} from './typings';

const getCondition = (selector: string): (node: ExtendedASTClass) => boolean => {
	const types = new Set<string | undefined>(selector.split(',').map(s => s.trim()).filter(Boolean));
	return (node: ExtendedASTClass): boolean => types.has(node.type);
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class ExtendedASTClass implements ExtendedAST {
	declare parentNode;
	declare childNodes: this[];
	declare data?: string;
	declare type?: TokenTypes;

	get nextSibling(): this | undefined {
		const siblings = this.parentNode?.childNodes;
		return siblings?.[siblings.indexOf(this) + 1];
	}

	get previousSibling(): this | undefined {
		const siblings = this.parentNode?.childNodes;
		return siblings?.[siblings.indexOf(this) - 1];
	}

	get firstChild(): this | undefined {
		return this.childNodes[0];
	}

	get lastChild(): this | undefined {
		return this.childNodes.at(-1);
	}

	get length(): number {
		// eslint-disable-next-line unicorn/prefer-minimal-ternary
		return typeof this.data === 'string' ? this.data.length : this.childNodes.length;
	}

	constructor(ast: AST, parent?: ExtendedASTClass) {
		Object.assign(this, ast);
		this.parentNode = parent as this | undefined;
		this.childNodes = ast.childNodes?.map(child => new ExtendedASTClass(child, this) as this) ?? [];
	}

	getRootNode(): this {
		let self = this; // eslint-disable-line unicorn/no-this-assignment
		while (self.parentNode) {
			self = self.parentNode;
		}
		return self;
	}

	is(type: TokenTypes): boolean {
		return this.type === type;
	}

	closest(selector: string): this | undefined {
		const condition = getCondition(selector);
		let {parentNode} = this;
		while (parentNode) {
			if (condition(parentNode)) {
				return parentNode;
			}
			({parentNode} = parentNode);
		}
		return undefined;
	}

	querySelector(selector: string): this | undefined {
		const condition = getCondition(selector),
			stack = [...this.childNodes].reverse(); // eslint-disable-line unicorn/no-array-reverse
		while (stack.length > 0) {
			const child = stack.pop()!;
			if (condition(child)) {
				return child;
			}
			const {childNodes} = child;
			for (let i = childNodes.length - 1; i >= 0; i--) {
				stack.push(childNodes[i]!);
			}
		}
		return undefined;
	}

	querySelectorAll(selector: string): this[] {
		const condition = getCondition(selector),
			stack = [...this.childNodes].reverse(), // eslint-disable-line unicorn/no-array-reverse
			descendants: this[] = [];
		while (stack.length > 0) {
			const child = stack.pop()!;
			if (condition(child)) {
				descendants.push(child);
			}
			const {childNodes} = child;
			for (let i = childNodes.length - 1; i >= 0; i--) {
				stack.push(childNodes[i]!);
			}
		}
		return descendants;
	}
}

const parse = async (wikitext: string, include?: boolean, qid?: number, stage?: number): Promise<ExtendedAST> =>
	new ExtendedASTClass(await wikiparse.json(wikitext, include, qid, stage)) as ExtendedAST;

wikiparse.parse = parse;
