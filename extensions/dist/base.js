(() => {
const workerJS = () => {
    importScripts('https://testingcf.jsdelivr.net/npm/wikiparser-node@1.12.2-b/bundle/bundle.min.js');
    const entities = { '&': 'amp', '<': 'lt', '>': 'gt' };
    self.onmessage = ({ data }) => {
        const [command, qid, wikitext, include, stage] = data;
        switch (command) {
            case 'setI18N':
                Parser.i18n = qid;
                break;
            case 'setConfig':
                Parser.config = qid;
                break;
            case 'getConfig':
                postMessage([qid, Parser.getConfig()]);
                break;
            case 'json':
                postMessage([qid, Parser.parse(wikitext, include).json()]);
                break;
            case 'lint':
                postMessage([qid, Parser.parse(wikitext, include).lint(), wikitext]);
                break;
            case 'print':
                postMessage([
                    qid,
                    Parser.parse(wikitext, include, stage).childNodes.map(child => [
                        stage !== null && stage !== void 0 ? stage : Infinity,
                        String(child),
                        child.type === 'text'
                            ? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
                            : child.print(),
                    ]),
                ]);
        }
    };
};
const blob = new Blob([`(${String(workerJS)})()`], { type: 'text/javascript' }), url = URL.createObjectURL(blob), worker = new Worker(url);
URL.revokeObjectURL(url);
const getListener = (qid, resolve, raw) => {
    const listener = ({ data: [rid, res, resRaw] }) => {
        if (rid === qid && (raw === undefined || raw === resRaw)) {
            worker.removeEventListener('message', listener);
            resolve(res);
        }
    };
    return listener;
};
const setI18N = (i18n) => {
    worker.postMessage(['setI18N', i18n]);
};
const setConfig = (config) => {
    worker.postMessage(['setConfig', config]);
};
const getFeedback = (command, qid, strict, raw, ...args) => new Promise(resolve => {
    worker.addEventListener('message', getListener(qid, resolve, strict ? raw : undefined));
    worker.postMessage([command, qid, raw, ...args]);
});
const getConfig = () => getFeedback('getConfig', -3);
const json = (wikitext, include, qid = -4) => getFeedback('json', qid, false, wikitext, include);
const print = (wikitext, include, stage, qid = -1) => getFeedback('print', qid, false, wikitext, include, stage);
const lint = (wikitext, include, qid = -2) => getFeedback('lint', qid, true, wikitext, include);
const append = (parent, text) => {
    if (text) {
        parent.append(text);
    }
};
const splitNewLine = (html) => {
    let cur = html.cloneNode();
    cur.style.padding = '';
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
            cur.style.padding = '';
            result.push(cur);
            append(cur, text);
        }
    }
    return result;
};
const getGutter = (container) => container.querySelector('.wikiparser-line-numbers');
const size = (html) => {
    const container = html.parentElement, gutter = getGutter(container);
    if (!gutter) {
        intersectionObserver.unobserve(html);
        return;
    }
    html.style.marginLeft = '';
    const start = Number(html.dataset['start'] || 1), lines = splitNewLine(html), width = `${String(lines.length + start - 1).length + 1.5}ch`;
    html.style.marginLeft = width;
    gutter.style.width = width;
    const sizer = document.createElement('span'), { style: { paddingLeft, paddingRight } } = html;
    sizer.className = 'wikiparser-sizer';
    sizer.style.paddingLeft = paddingLeft;
    sizer.style.paddingRight = paddingRight;
    for (const child of lines) {
        sizer.append(child, '\n');
    }
    html.append(sizer);
    let line, lastTop;
    for (let i = 0; i < lines.length; i++) {
        const child = lines[i], { top } = child.getBoundingClientRect();
        if (line) {
            line.style.height = `${top - lastTop}px`;
        }
        line = document.createElement('span');
        line.textContent = String(i + start);
        gutter.append(line);
        lastTop = top;
    }
    if (line) {
        const noScroll = html.offsetHeight <= container.clientHeight;
        if (html.isContentEditable) {
            line.style.height = `${container.clientHeight}px`;
        }
        else if (noScroll) {
            line.style.height = `${container.getBoundingClientRect().top + container.scrollHeight - lastTop}px`;
            container.style.overflowY = 'hidden';
        }
        else {
            line.style.height = `${html.getBoundingClientRect().bottom - lastTop}px`;
            container.style.overflowY = '';
        }
    }
    sizer.remove();
    intersectionObserver.unobserve(html);
};
const intersectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
        if (!entry.isIntersecting) {
            continue;
        }
        size(entry.target);
    }
});
const lineNumbers = (html, start = 1, paddingTop = '') => {
    const container = html.parentElement, gutter = document.createElement('span');
    html.dataset['start'] = String(start);
    gutter.className = 'wikiparser-line-numbers';
    gutter.style.paddingTop = paddingTop;
    container.classList.add('wikiparse-container');
    container.append(gutter);
    if (getComputedStyle(html).whiteSpace !== 'pre') {
        html.style.whiteSpace = 'pre-wrap';
    }
    if (html.offsetParent) {
        size(html);
    }
    else {
        intersectionObserver.observe(html);
    }
};
const wikiparse = { id: 0, setI18N, setConfig, getConfig, print, lint, json, lineNumbers };
Object.assign(window, { wikiparse });
})();
