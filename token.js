class Token extends Array {
	constructor(token) {
		super(0);
		if (Array.isArray(token)) {
			this.push(...token);
		} else if (typeof token === 'string') {
			this.push(token);
		} else {
			throw new TypeError('仅接受Array或String作为输入参数！');
		}
		this.type = 'plain';
	}

	toString() {
		return this.join('');
	}
}

module.exports = Token;
