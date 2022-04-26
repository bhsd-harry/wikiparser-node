class WikiText extends String {
	replace(...args) {
		return new WikiText(super.replace.apply(this, args));
	}

	replaceAll(...args) {
		return new WikiText(super.replaceAll.apply(this, args));
	}

	replace_till_stable(...args) {
		const MAX_SIZE = 1024 ** 2;
		let i = 0,
			text = this.valueOf(),
			original = '';
		while (i < 50 && text.length < MAX_SIZE && original !== text) {
			original = text;
			text = original.replaceAll(...args);
			i++;
		}
		return new WikiText(text);
	}
}

module.exports = WikiText;
