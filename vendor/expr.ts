/**
 * 计算`#expr`表达式的值
 * @author t7ru
 * @license MIT
 * @see https://github.com/t7ru/mediawiki-expr/blob/master/index.js
 */
/* eslint-disable jsdoc/require-jsdoc */

declare interface Token {
	type: 'number' | 'word' | 'op' | 'paren' | 'eof';
	value: string;
}
declare type ExprNode = {
	type: 'unary';
	op: string;
	arg: ExprNode;
} | {
	type: 'binary';
	op: string;
	left: ExprNode;
	right: ExprNode;
} | {
	type: 'number';
	value: number;
};

const PRECEDENCE = {
	'+u': 10,
	'-u': 10,
	e: 10,
	sin: 9,
	cos: 9,
	tan: 9,
	asin: 9,
	acos: 9,
	atan: 9,
	exp: 9,
	ln: 9,
	abs: 9,
	floor: 9,
	trunc: 9,
	ceil: 9,
	not: 9,
	sqrt: 9,
	'^': 8,
	'*': 7,
	'/': 7,
	div: 7,
	mod: 7,
	fmod: 7,
	'+': 6,
	'-': 6,
	round: 5,
	'=': 4,
	'<': 4,
	'>': 4,
	'<=': 4,
	'>=': 4,
	'<>': 4,
	'!=': 4,
	and: 3,
	or: 2,
	pi: 0,
};

declare type Op = keyof typeof PRECEDENCE;

const WORD_OPERATORS = new Set<Op>([
	'mod',
	'fmod',
	'and',
	'or',
	'not',
	'round',
	'div',
	'e',
	'sin',
	'cos',
	'tan',
	'asin',
	'acos',
	'atan',
	'exp',
	'ln',
	'abs',
	'trunc',
	'floor',
	'ceil',
	'pi',
	'sqrt',
]);

const PREFIX_OPERATORS = new Set<Op>([
	'+',
	'-',
	'not',
	'sin',
	'cos',
	'tan',
	'asin',
	'acos',
	'atan',
	'exp',
	'ln',
	'abs',
	'trunc',
	'floor',
	'ceil',
	'sqrt',
]);

const expression = Symbol('expression'),
	operator = Symbol('operator');

const throwUnclosed = (): never => {
		throw new SyntaxError('Unclosed bracket.');
	},
	throwUnknown = (value: string): never => {
		throw new SyntaxError(`Unknown error (${value}).`);
	},
	throwDevision = (right: number): void => {
		if (right === 0) {
			throw new Error('Division by zero.');
		}
	};

const tokenize = (exp: string): Token[] => {
	const tokens: Token[] = [],
		input = exp
			.replaceAll(/&lt;/giu, '<')
			.replaceAll(/&gt;/giu, '>')
			.replaceAll(/&minus;|−/gu, '-');
	let i = 0,
		parens = 0,
		expecting = expression;
	const throwNumber = (): void => {
			if (expecting === operator) {
				throw new SyntaxError('Unexpected number.');
			}
		},
		throwOperator = (op: string, unexpected: symbol): void => {
			if (expecting === unexpected) {
				throw new SyntaxError(`Unexpected ${op} operator.`);
			}
		};
	while (i < input.length) {
		const ch = input[i]!;
		if (/[ \t\r\n]/u.test(ch)) {
			i++;
			continue;
		} else if (/[\d.]/u.test(ch)) {
			throwNumber();
			let value = '';
			for (let c: string | undefined = ch; i < input.length && /[\d.]/u.test(c!); c = input[++i]) {
				value += c;
			}
			tokens.push({type: 'number', value});
			expecting = operator;
			continue;
		} else if (/[a-z]/iu.test(ch)) {
			let word = '';
			for (let c: string | undefined = ch; i < input.length && /[a-z]/iu.test(c!); c = input[++i]) {
				word += c;
			}
			const value = word.toLowerCase();
			if (!WORD_OPERATORS.has(value as Op)) {
				throw new SyntaxError(`Unrecognized word "${word}".`);
			} else if (value === 'e') {
				expecting = expecting === operator ? expression : operator;
			} else if (value === 'pi') {
				throwNumber();
				expecting = operator;
			} else if (PREFIX_OPERATORS.has(value as Op)) {
				throwOperator(value, operator);
			} else {
				throwOperator(value, expression);
				expecting = expression;
			}
			tokens.push({type: 'word', value});
			continue;
		}
		const value = input.slice(i, i + 2);
		if (['<=', '>=', '<>', '!='].includes(value)) {
			throwOperator(value, expression);
			tokens.push({type: 'op', value});
			i += 2;
			expecting = expression;
			continue;
		} else if ('+-*/^=<>'.includes(ch)) {
			if (ch !== '+' && ch !== '-') {
				throwOperator(ch, expression);
			}
			tokens.push({type: 'op', value: ch});
			i++;
			expecting = expression;
			continue;
		} else if (ch === '(') {
			throwOperator(ch, operator);
			tokens.push({type: 'paren', value: ch});
			i++;
			parens++;
			continue;
		} else if (ch === ')') {
			if (--parens < 0) {
				throw new SyntaxError('Unexpected closing bracket.');
			}
			tokens.push({type: 'paren', value: ch});
			i++;
			expecting = operator;
			continue;
		}
		throw new SyntaxError(`Unrecognized punctuation character "${ch}".`);
	}
	if (parens) {
		throwUnclosed();
	}
	tokens.push({type: 'eof', value: ''});
	return tokens;
};

class ExprParser {
	pos = 0;
	declare tokens: Token[];

	constructor(exp: string) {
		this.tokens = tokenize(exp);
	}

	current(): Token {
		return this.tokens[this.pos]!;
	}

	parse(): ExprNode {
		const node = this.parseExpression(0),
			{type, value} = this.current();
		if (type !== 'eof') {
			throwUnknown(value);
		}
		return node;
	}

	getBinaryOp(): Op | null {
		const {type, value} = this.current();
		return type === 'op' && value in PRECEDENCE
			|| type === 'word' && ['mod', 'fmod', 'and', 'or', 'round', 'div', 'e'].includes(value)
			? value as Op
			: null;
	}

	parseExpression(minPrec: number, operand?: string): ExprNode {
		let left = this.parsePrefix(operand);
		while (true) {
			const op = this.getBinaryOp();
			if (!op) {
				break;
			}
			const prec = PRECEDENCE[op];
			if (prec < minPrec) {
				break;
			}
			this.pos++;
			left = {
				type: 'binary',
				op,
				left,
				right: this.parseExpression(prec + 1, op),
			};
		}
		return left;
	}

	parsePrefix(operand?: string): ExprNode {
		const {type, value} = this.current();
		if (type === 'eof' && operand) {
			throw new SyntaxError(
				`Missing operand for ${operand === '+u' || operand === '-u' ? operand[0] : operand}.`,
			);
		} else if (type === 'op' && (value === '+' || value === '-')) {
			this.pos++;
			const op = `${value}u`;
			return {
				type: 'unary',
				op,
				arg: this.parseExpression(PRECEDENCE[op as Op]),
			};
		} else if (type === 'word') {
			const name = value;
			if (name === 'pi' || name === 'e') {
				this.pos++;
				return {
					type: 'number',
					value: Math[name === 'e' ? 'E' : 'PI'],
				};
			} else if (PREFIX_OPERATORS.has(name as Op)) {
				this.pos++;
				return {
					type: 'unary',
					op: name,
					arg: this.parseExpression(PRECEDENCE[name as Op]),
				};
			}
		} else if (type === 'number') {
			this.pos++;
			return {
				type: 'number',
				value: parseFloat((value.startsWith('.') ? '0' : '') + value),
			};
		} else if (type === 'paren' && value === '(') {
			this.pos++;
			const inner = this.parseExpression(0),
				close = this.current();
			if (close.type !== 'paren' || close.value !== ')') {
				throwUnclosed();
			}
			this.pos++;
			return inner;
		}
		return throwUnknown(value);
	}
}

const emit = (node: ExprNode): number => {
	if (node.type === 'number') {
		return node.value;
	}
	const {type, op} = node;
	if (type === 'unary') {
		const arg = emit(node.arg);
		switch (op) {
			case '+u':
				return arg;
			case '-u':
				return -arg;
			case 'not':
				return arg ? 0 : 1;
			case 'asin':
			case 'acos':
				if (Math.abs(arg) > 1) {
					throw new Error(`Invalid argument for ${op}: less than -1 or greater than 1.`);
				}
				// fall through
			case 'sin':
			case 'cos':
			case 'tan':
			case 'atan':
			case 'exp':
			case 'abs':
			case 'floor':
			case 'ceil':
			case 'trunc':
				return Math[op](arg);
			case 'ln':
				if (arg <= 0) {
					throw new Error('Invalid argument for ln: less than or equal to 0.');
				}
				return Math.log(arg);
			case 'sqrt':
				if (arg < 0) {
					throw new Error('In sqrt: Result is not a number.');
				}
				return Math.sqrt(arg);
			// no default
		}
	} else {
		const left = emit(node.left),
			right = emit(node.right);
		switch (op) {
			case '+':
				return left + right;
			case '-':
				return left - right;
			case '*':
				return left * right;
			case '/':
			case 'div':
				throwDevision(right);
				return left / right;
			case '^':
				return left ** right;
			case 'mod': {
				const b = Math.trunc(right);
				throwDevision(b);
				return Math.trunc(left) % b;
			}
			case 'fmod':
				throwDevision(right);
				return left % right;
			case 'round': {
				const digits = Math.trunc(right);
				if (digits >= 0) {
					return Number(left.toFixed(digits));
				}
				const factor = 10 ** digits;
				return factor === 0 ? 0 : Math.round(left * factor) / factor;
			}
			case '=':
				return left === right ? 1 : 0;
			case '<>':
			case '!=':
				return left === right ? 0 : 1;
			case '<':
				return left < right ? 1 : 0;
			case '>':
				return left > right ? 1 : 0;
			case '<=':
				return left <= right ? 1 : 0;
			case '>=':
				return left >= right ? 1 : 0;
			case 'and':
				return left && right ? 1 : 0;
			case 'or':
				return left || right ? 1 : 0;
			case 'e': {
				if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isInteger(right)) {
					return left * 10 ** right;
				}
				const [coefficient, exponent = 0] = String(left).split('e'),
					result = Number(`${coefficient}e${Number(exponent) + right}`);
				return result === 0 ? 0 : result;
			}
			// no default
		}
	}
	return throwUnknown(op);
};

/**
 * Evaluates MediaWiki `#expr` syntax.
 * @param exp expression to evaluate
 */
export const expr = (exp: string): string | number => {
	try {
		return emit(new ExprParser(exp).parse());
	} catch (e) {
		return `<strong class="error">${
			e instanceof SyntaxError ? 'Expression error: ' : ''
		}${(e as Error).message}</strong>`;
	}
};
