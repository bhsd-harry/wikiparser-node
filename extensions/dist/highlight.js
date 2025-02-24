(() => {
"use strict";
const highlight = async (ele, include, linenums, start) => {
    if (ele.classList.contains('wikiparser')) {
        return;
    }
    let { innerText } = ele;
    if (innerText.endsWith('\n')) {
        innerText = innerText.slice(0, -1);
    }
    innerText || (innerText = ' ');
    const html = `<span class="wpb-root">${(await wikiparse.print(innerText, include)).map(([, , printed]) => printed).join('')}</span>`;
    ele.classList.add('wikiparser');
    ele.tabIndex = 0;
    ele.innerHTML = html;
    if (linenums) {
        wikiparse.lineNumbers(ele.firstChild, start);
    }
    ele.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            const range = document.createRange(), selection = getSelection();
            range.selectNodeContents(ele.firstChild);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
};
wikiparse.highlight = highlight;
})();
