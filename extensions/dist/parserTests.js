(() => {
"use strict";
(async () => {
    const tests = await (await fetch('./test/parserTests.json')).json(), select = document.querySelector('select'), pre = document.querySelector('pre'), container = document.getElementById('frame');
    Parser.config = await (await fetch('./config/default.json')).json();
    wikiparse.print = (wikitext, include, stage) => {
        const printed = Parser.parse(wikitext, include, stage).print();
        return Promise.resolve([[stage !== null && stage !== void 0 ? stage : Infinity, wikitext, printed]]);
    };
    wikiparse.highlight(pre, false, true);
    let optgroup;
    for (const [i, { desc, wikitext }] of tests.entries()) {
        if (wikitext === undefined) {
            optgroup = document.createElement('optgroup');
            optgroup.label = desc;
            if (desc === 'legacyMedia') {
                optgroup.hidden = true;
            }
            select.append(optgroup);
        }
        else {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = desc;
            optgroup.append(option);
        }
    }
    select.addEventListener('change', () => {
        const { wikitext, html } = tests[Number(select.value)];
        pre.textContent = wikitext;
        pre.classList.remove('wikiparser');
        container.innerHTML = html;
        for (const img of container.querySelectorAll('img[src]')) {
            img.src = '/wikiparser-node/assets/bad-image.svg';
            img.removeAttribute('srcset');
        }
        wikiparse.highlight(pre, false, true);
        select.selectedOptions[0].disabled = true;
    });
    container.addEventListener('click', e => {
        e.preventDefault();
    }, { capture: true });
})();
})();
