import type {wikiparse as Wikiparse} from './typings';

const {wikiparse} = window as unknown as {wikiparse: Wikiparse};

/**
 * 高亮代码块
 * @param ele 代码块
 * @param linenums 是否添加行号
 * @param start 起始行号
 */
const highlight = async (ele: HTMLElement, linenums: boolean, start = 1): Promise<void> => {
	if (ele.classList.contains('highlighted')) {
		return;
	}
	const html = (await wikiparse.print(ele.innerText)).map(([,, printed]) => printed).join('');
	ele.classList.add('highlighted');
	if (linenums) {
		// 添加行号。这里不使用<table>排版，而是使用<ol>
		const lines = html.split('\n').map((line, i) => {
			const li = document.createElement('li');
			li.id = `L${i + start}`;
			li.innerHTML = line;
			return li;
		});
		if (!lines[lines.length - 1]!.textContent) {
			lines.pop();
		}
		const ol = document.createElement('ol');
		ol.start = start;
		ol.style.paddingLeft = `${String(lines.length + start - 1).length + 2.5}ch`;
		ol.append(...lines);
		ele.replaceChildren(ol);
	} else {
		ele.innerHTML = html;
	}
};

wikiparse.highlight = highlight;
