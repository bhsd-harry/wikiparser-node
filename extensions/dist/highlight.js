(() => {
"use strict";
const highlight = async (ele, include, linenums = false, start = 1) => {
    if (ele.classList.contains('highlighted')) {
        return;
    }
    const html = (await wikiparse.print(ele.innerText, include)).map(([, , printed]) => printed).join('');
    ele.classList.add('highlighted');
    if (linenums) {
        const lines = html.split('\n').map((line, i) => {
            const li = document.createElement('li');
            li.id = `L${i + start}`;
            li.innerHTML = line;
            return li;
        });
        if (!lines[lines.length - 1].textContent) {
            lines.pop();
        }
        const ol = document.createElement('ol');
        ol.start = start;
        ol.style.paddingLeft = `${String(lines.length + start - 1).length + 2.5}ch`;
        ol.append(...lines);
        ele.replaceChildren(ol);
    }
    else {
        ele.innerHTML = html;
    }
};
wikiparse.highlight = highlight;
})();
