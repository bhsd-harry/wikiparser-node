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
const dblClickHandler = (container, container1, container2, btn, e) => {
    e === null || e === void 0 ? void 0 : e.preventDefault();
    const isSource = Boolean(container.dataset['source']);
    if (btn) {
        btn.disabled = isSource;
    }
    if (isSource) {
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
const repaint = (container, container1, container2, html, render, isGH) => {
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
            .querySelectorAll('.mw-editsection'), tocToggles = container1
            .querySelectorAll('#toctogglecheckbox, .toctogglespan'), tocTitles = container1.querySelectorAll('.toctitle'), anchors = container1.querySelectorAll('a[href]');
        if (!isGH) {
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
            for (const ele of tocTitles) {
                ele.removeAttribute('lang');
                ele.removeAttribute('dir');
            }
            for (const ele of tocToggles) {
                const { nextSibling } = ele;
                if ((nextSibling === null || nextSibling === void 0 ? void 0 : nextSibling.nodeType) === Node.TEXT_NODE
                    && nextSibling.textContent.startsWith('\n\n')) {
                    nextSibling.deleteData(0, 2);
                }
                ele.remove();
            }
        }
        for (const ele of edits) {
            ele.remove();
        }
        for (const ele of anchors) {
            try {
                const url = new URL(ele.href);
                if (ele.classList.contains('mw-magiclink-pmid')) {
                    url.protocol = 'https:';
                }
                if (ele.classList.contains('external')) {
                    ele.href = url.href;
                }
                else if (url.origin === location.origin
                    && url.pathname === '/index.php'
                    && url.searchParams.has('title')) {
                    url.pathname = `/wiki/${url.searchParams.get('title').replaceAll(':', '%3A')}`;
                    url.searchParams.delete('title');
                    ele.setAttribute('href', url.pathname + url.search);
                }
            }
            catch {
                ele.removeAttribute('href');
            }
            ele.classList.remove('text', 'autonumber', 'internal', 'mw-magiclink-pmid', 'mw-magiclink-rfc', 'mw-magiclink-isbn');
            if (ele.classList.length === 0) {
                ele.removeAttribute('class');
            }
        }
        if (!isGH && container1.innerHTML === container2.innerHTML) {
            dblClickHandler(container, container1, container2);
        }
    }
};
(async () => {
    const key = 'wikiparser-node-done', isGH = location.hostname.endsWith('.github.io');
    let reviewed = null;
    if (!isGH) {
        reviewed = JSON.parse(localStorage.getItem(key));
        if (!reviewed) {
            reviewed = await (await fetch('./test/reviewed.json')).json();
            localStorage.setItem(key, JSON.stringify(reviewed));
        }
    }
    const tests = await (await fetch('./test/parserTests.json')).json(), dones = new Set(reviewed), input = document.getElementById('search'), select = document.querySelector('select'), btns = document.querySelectorAll('button'), btnDone = btns[0], btnDiff = btns[1], diffFrame = document.getElementById('diffFrame'), pre = document.querySelector('pre'), container = document.getElementById('frame'), container1 = document.getElementById('frame1'), container2 = document.getElementById('frame2');
    wikiparse.setConfig(await (await fetch('./config/default.json')).json());
    await wikiparse.highlight(pre, false, true);
    let optgroup;
    for (let i = 0; i < tests.length; i++) {
        const { desc, html } = tests[i];
        optgroup = addOption(optgroup, select, tests, dones, i, !ignoredGroups.has(desc), isIframe || html !== undefined);
    }
    select.addEventListener('change', () => {
        const { html, render } = tests[Number(select.value)];
        repaint(container, container1, container2, html, render, isGH);
        changeHandler(pre, btnDone, select, tests);
        btnDiff.disabled = true;
        diffFrame.style.display = 'none';
        dispatchEvent(new CustomEvent('casechange'));
    });
    container.addEventListener('click', e => {
        e.preventDefault();
    }, { capture: true });
    container.addEventListener('dblclick', e => {
        dblClickHandler(container, container1, container2, btnDiff, e);
    });
    prepareDoneBtn(btnDone, select, tests, dones, key);
    inputHandler(input, select, dones);
    hashChangeHandler(select, tests);
    if (!isGH) {
        btnDiff.style.display = '';
        btnDiff.addEventListener('click', () => {
            (async () => {
                if (typeof Diff === 'undefined') {
                    await import('https://cdn.jsdelivr.net/npm/diff');
                }
                diffFrame.innerHTML = '';
                diffFrame.style.display = '';
                for (const part of Diff.diffWordsWithSpace(container1.textContent, container2.textContent)) {
                    const span = document.createElement('span');
                    span.textContent = part.value;
                    if (part.added || part.removed) {
                        span.classList.add(`diff-${part.added ? 'added' : 'removed'}`);
                        if (!/[^\n]/u.test(part.value)) {
                            span.classList.add('diff-empty');
                        }
                    }
                    diffFrame.append(span);
                }
                btnDiff.disabled = true;
            })();
        });
    }
})();
