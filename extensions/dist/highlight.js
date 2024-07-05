(() => {
"use strict";
const append = (parent, text) => {
    if (text) {
        parent.append(text);
    }
};
const splitNewLine = (html) => {
    let cur = html.cloneNode();
    const result = [cur];
    for (const child of html.childNodes) {
        const { textContent } = child;
        if (!(textContent === null || textContent === void 0 ? void 0 : textContent.includes('\n'))) {
            cur.append(child.cloneNode(true));
            continue;
        }
        const lines = child.nodeType === Node.TEXT_NODE ? textContent.split('\n') : splitNewLine(child);
        append(cur, lines[0]);
        for (const text of lines.slice(1)) {
            cur = html.cloneNode();
            result.push(cur);
            append(cur, text);
        }
    }
    return result;
};
const highlight = async (ele, include, linenums = false, start = 1) => {
    if (ele.classList.contains('wikiparser')) {
        return;
    }
    const html = (await wikiparse.print(ele.innerText, include)).map(([, , printed]) => printed).join('');
    ele.classList.add('wikiparser');
    if (linenums) {
        const root = document.createElement('span');
        root.innerHTML = html;
        const lines = splitNewLine(root.firstElementChild || root).map((line, i) => {
            const li = document.createElement('li');
            li.id = `L${i + start}`;
            li.append(line);
            return li;
        }), { length } = lines;
        if (length > 1 && !lines[length - 1].textContent) {
            lines.pop();
        }
        const ol = document.createElement('ol');
        ol.style.counterReset = `wikiparser ${start - 1}`;
        ol.style.paddingLeft = `${String(lines.length + start - 1).length + 1.5}ch`;
        ol.replaceChildren(...lines);
        ele.replaceChildren(ol);
    }
    else {
        ele.innerHTML = html;
    }
};
wikiparse.highlight = highlight;
})();
