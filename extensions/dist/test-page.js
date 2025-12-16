import { prepareDoneBtn, addOption, changeHandler, hashChangeHandler, inputHandler } from './test-page-common.js';
const ignoredGroups = new Set([
    'imageMapParserTests',
    'citeParserTests',
    'citeSmokeTests',
    'parserFunctionTests',
    'responsiveReferencesTests',
    'subReferencingTests',
    'urlFragmentModeTests',
]);
const isIframe = self !== top;
const removeClass = (ele, ...cls) => {
    ele.classList.remove(...cls);
    if (ele.classList.length === 0) {
        ele.removeAttribute('class');
    }
};
const dblClickHandler = (container, container1, container2, e) => {
    e === null || e === void 0 ? void 0 : e.preventDefault();
    if (container.dataset['source']) {
        container.removeAttribute('data-source');
        container1.innerHTML = container1.textContent;
        container2.innerHTML = container2.textContent;
    }
    else {
        container.dataset['source'] = '1';
        const pre1 = document.createElement('pre'), pre2 = document.createElement('pre'), code1 = document.createElement('code'), code2 = document.createElement('code');
        code1.textContent = container1.innerHTML;
        code2.textContent = container2.innerHTML;
        pre1.className = 'language-html';
        pre2.className = 'language-html';
        pre1.append(code1);
        pre2.append(code2);
        container1.replaceChildren(pre1);
        container2.replaceChildren(pre2);
        Prism.highlightAllUnder(container);
    }
};
const repaint = (container, container1, container2, html, render) => {
    var _a;
    container.removeAttribute('data-source');
    if (html === undefined) {
        container.style.display = 'none';
    }
    else {
        container.style.display = '';
        container1.innerHTML = html;
        container2.innerHTML = render !== null && render !== void 0 ? render : '';
        const classes = ['mw-default-size', 'mw-poem-indented', 'mw-html-heading'], withClasses = container1
            .querySelectorAll(classes.map(c => `.${c}`).join()), empty = container1.querySelectorAll('.mw-empty-elt'), styles = container1
            .querySelectorAll('[style="/* insecure input */"]'), typeofs = container1.querySelectorAll('span[typeof]'), edits = container1
            .querySelectorAll('.mw-editsection'), tocs = container1.querySelectorAll('#toc'), anchors = container1.querySelectorAll('a[href]');
        (_a = container2.querySelector('#catlinks')) === null || _a === void 0 ? void 0 : _a.remove();
        for (const ele of withClasses) {
            removeClass(ele, ...classes);
        }
        for (const ele of empty) {
            if (ele.childElementCount === 0 && !ele.textContent.trim()) {
                removeClass(ele, 'mw-empty-elt');
            }
        }
        for (const ele of styles) {
            ele.removeAttribute('style');
        }
        for (const ele of typeofs) {
            ele.removeAttribute('typeof');
        }
        for (const ele of edits) {
            ele.remove();
        }
        for (const ele of tocs) {
            const { nextSibling } = ele;
            if ((nextSibling === null || nextSibling === void 0 ? void 0 : nextSibling.nodeType) === Node.TEXT_NODE
                && nextSibling.textContent.startsWith('\n\n')) {
                nextSibling.deleteData(0, 2);
            }
            ele.remove();
        }
        for (const ele of anchors) {
            ele.classList.remove('text', 'autonumber', 'mw-magiclink-pmid', 'mw-magiclink-rfc');
            try {
                const url = new URL(ele.href);
                if (ele.classList.contains('external')) {
                    ele.href = url.href;
                }
                else if (url.origin === location.origin
                    && url.pathname === '/index.php'
                    && url.searchParams.has('title')) {
                    url.pathname = `/wiki/${url.searchParams.get('title').replace(/:/gu, '%3A')}`;
                    url.searchParams.delete('title');
                    ele.setAttribute('href', url.pathname + url.search);
                }
            }
            catch {
                ele.removeAttribute('href');
            }
        }
        if (isIframe && container1.innerHTML === container2.innerHTML) {
            dblClickHandler(container, container1, container2);
        }
    }
};
(async () => {
    const key = 'wikiparser-node-done';
    let reviewed = null;
    if (!location.hostname.endsWith('.github.io')) {
        reviewed = JSON.parse(localStorage.getItem(key));
        if (!reviewed) {
            reviewed = await (await fetch('./test/reviewed.json')).json();
            localStorage.setItem(key, JSON.stringify(reviewed));
        }
    }
    const tests = await (await fetch('./test/parserTests.json')).json(), dones = new Set(reviewed), input = document.getElementById('search'), select = document.querySelector('select'), btn = document.querySelector('button'), pre = document.querySelector('pre'), container = document.getElementById('frame'), container1 = document.getElementById('frame1'), container2 = document.getElementById('frame2');
    wikiparse.setConfig(await (await fetch('./config/default.json')).json());
    await wikiparse.highlight(pre, false, true);
    let optgroup;
    for (let i = 0; i < tests.length; i++) {
        const { desc, html } = tests[i];
        optgroup = addOption(optgroup, select, tests, dones, i, !ignoredGroups.has(desc), isIframe || html !== undefined);
    }
    select.addEventListener('change', () => {
        const { html, render } = tests[Number(select.value)];
        repaint(container, container1, container2, html, render);
        changeHandler(pre, btn, select, tests);
        dispatchEvent(new CustomEvent('casechange'));
    });
    container.addEventListener('click', e => {
        e.preventDefault();
    }, { capture: true });
    container.addEventListener('dblclick', e => {
        dblClickHandler(container, container1, container2, e);
    });
    prepareDoneBtn(btn, select, tests, dones, key);
    inputHandler(input, select, dones);
    hashChangeHandler(select, tests);
})();
