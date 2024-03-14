(() => {
"use strict";
(async () => {
    const tests = await (await fetch('./test/parserTests.json')).json(), select = document.querySelector('select'), container = document.querySelector('.tab');
    select.append(...tests.map(({ desc }, i) => {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = desc;
        return option;
    }));
    select.addEventListener('change', () => {
        container.innerHTML = '';
        const { print, html } = tests[Number(select.value)];
        const pre = document.createElement('pre');
        pre.className = 'wikiparser tests';
        pre.innerHTML = print;
        container.prepend(pre);
        const section = document.createElement('div');
        section.className = 'tests';
        section.innerHTML = html;
        container.append(section);
        select.selectedOptions[0].disabled = true;
    });
    container.addEventListener('click', e => {
        e.preventDefault();
    }, { capture: true });
})();
})();
