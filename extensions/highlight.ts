/**
 * 插入非空文本
 * @param parent span元素
 * @param text 文本
 */
const append = (parent: Element, text: string | Element): void => {
	if (text) {
		parent.append(text);
	}
};

/**
 * 将span元素拆分为多个span元素，每个span元素都不包含换行符
 * @param html span元素
 */
const splitNewLine = (html: Element): Element[] => {
	let cur = html.cloneNode() as Element;
	const result = [cur];
	for (const child of html.childNodes as NodeListOf<Element | Text>) {
		const {textContent} = child;
		if (!textContent?.includes('\n')) {
			cur.append(child.cloneNode(true));
			continue;
		}
		const lines = child.nodeType === Node.TEXT_NODE ? textContent.split('\n') : splitNewLine(child as Element);
		append(cur, lines[0]!);
		for (const text of lines.slice(1)) {
			cur = html.cloneNode() as Element;
			result.push(cur);
			append(cur, text);
		}
	}
	return result;
};

/**
 * 高亮代码块
 * @param ele 代码块
 * @param include 是否嵌入
 * @param linenums 是否添加行号
 * @param start 起始行号
 */
const highlight = async (ele: HTMLElement, include?: boolean, linenums = false, start = 1): Promise<void> => {
	if (ele.classList.contains('wikiparser')) {
		return;
	}
	const html = (await wikiparse.print(ele.innerText, include)).map(([,, printed]) => printed).join('');
	ele.classList.add('wikiparser');
	ele.tabIndex = 0;
	if (linenums) {
		const root = document.createElement('span');
		root.innerHTML = html;
		// 添加行号。这里不使用<table>排版，而是使用<ol>
		const lines = splitNewLine(root.firstElementChild || root).map((line, i) => {
				const li = document.createElement('li');
				li.id = `L${i + start}`;
				li.append(line);
				return li;
			}),
			{length} = lines;
		if (length > 1 && !lines[length - 1]!.textContent) {
			lines.pop();
		}
		const ol = document.createElement('ol');
		ol.style.counterReset = `wikiparser ${start - 1}`;
		ol.style.paddingLeft = `${String(lines.length + start - 1).length + 1.5}ch`;
		ol.replaceChildren(...lines);
		ele.replaceChildren(ol);
	} else {
		ele.innerHTML = html;
	}
	ele.addEventListener('keydown', e => {
		if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
			e.preventDefault();
			const range = document.createRange(),
				selection = window.getSelection()!;
			range.selectNodeContents(ele);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	});
};

wikiparse.highlight = highlight;
