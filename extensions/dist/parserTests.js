(() => {
"use strict";
(async () => {
    const tests = await (await fetch('./test/parserTests.json')).json(), select = document.querySelector('select'), pre = document.querySelector('pre'), container = document.getElementById('frame'), seen = new Set();
    Parser.config = await (await fetch('./config/default.json')).json();
    wikiparse.print = (wikitext, include, stage) => {
        const printed = Parser.parse(wikitext, include, stage).print();
        return Promise.resolve([[stage !== null && stage !== void 0 ? stage : Infinity, wikitext, printed]]);
    };
    wikiparse.highlight(pre, false, true);
    select.append(...tests.map(({ desc }, i) => {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = desc;
        return option;
    }));
    const findUnique = (html) => {
        var _a, _b;
        const temp = new Set();
        for (const ele of (_a = html.match(/<\w.*?>/gu)) !== null && _a !== void 0 ? _a : []) {
            const mt = /<(\w+(?=[\s/>]))(?:.*(\sclass="[^"]+"))?/u.exec(ele), tag = `<${mt[1]}${(_b = mt[2]) !== null && _b !== void 0 ? _b : ''}>`;
            if (!seen.has(tag)) {
                temp.add(tag);
            }
        }
        return temp;
    };
    select.addEventListener('change', () => {
        const { wikitext, html } = tests[Number(select.value)];
        pre.textContent = wikitext;
        pre.classList.remove('wikiparser');
        container.innerHTML = html;
        wikiparse.highlight(pre, false, true);
        select.selectedOptions[0].disabled = true;
        const tags = findUnique(html);
        console.info(tags);
        for (const tag of tags) {
            seen.add(tag);
        }
    });
    container.addEventListener('click', e => {
        e.preventDefault();
    }, { capture: true });
    document.body.addEventListener('keydown', e => {
        if (e.metaKey && e.key === 'ArrowDown') {
            e.preventDefault();
            const { selectedIndex, options } = select;
            for (let i = selectedIndex + 1; i < options.length; i++) {
                if (!options[i].disabled) {
                    const tags = findUnique(tests[i - 1].html);
                    if (tags.size > 0) {
                        select.selectedIndex = i;
                        select.dispatchEvent(new Event('change'));
                        break;
                    }
                }
            }
        }
    });
})();
})();
