(() => {
var _a;
const version = '1.16.1', src = (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.src, file = /\/extensions\/dist\/base\.(?:min\.)?js$/u, CDN = src && file.test(src)
    ? src.replace(file, '')
    : `https://testingcf.jsdelivr.net/npm/wikiparser-node@${version}`;
const workerJS = () => {
    importScripts('$CDN/bundle/bundle.lsp.js');
    const entities = { '&': 'amp', '<': 'lt', '>': 'gt' }, lsps = new Map();
    const getLSP = (qid, signature) => {
        let id = Math.floor(qid);
        if (signature) {
            id += 0.5;
        }
        if (lsps.has(id)) {
            return lsps.get(id);
        }
        const lsp = Parser.createLanguageService({});
        lsps.set(id, lsp);
        return lsp;
    };
    const parseColor = (s) => {
        var _a;
        if (s.startsWith('#')) {
            const short = s.length < 7;
            return [
                parseInt(short ? s.charAt(1).repeat(2) : s.slice(1, 3), 16),
                parseInt(short ? s.charAt(2).repeat(2) : s.slice(3, 5), 16),
                parseInt(short ? s.charAt(3).repeat(2) : s.slice(5, 7), 16),
                parseInt((short ? s.charAt(4).repeat(2) : s.slice(7, 9)) || 'ff', 16) / 255,
            ];
        }
        const values = s.slice(s.indexOf('(') + 1, -1).trim().split(/\s+(?:[,/]\s*)?|[,/]\s*/u)
            .map(v => parseFloat(v) / (v.endsWith('%') ? 100 : 1));
        return [
            values[0],
            values[1],
            values[2],
            (_a = values[3]) !== null && _a !== void 0 ? _a : 1,
        ];
    };
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
                postMessage([qid, Parser.parse(wikitext, include, stage).json()]);
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
                break;
            case 'destroy':
                getLSP(qid).destroy();
                getLSP(qid, true).destroy();
                lsps.delete(qid);
                lsps.delete(qid + 0.5);
                break;
            case 'data':
                getLSP(qid).data = wikitext;
                getLSP(qid, true).data = wikitext;
                break;
            case 'colorPresentations':
                postMessage([qid, getLSP(qid).provideColorPresentations(wikitext)]);
                break;
            case 'documentColors':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideDocumentColors(parseColor, wikitext, false), wikitext]);
                })();
                break;
            case 'foldingRanges':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideFoldingRanges(wikitext), wikitext]);
                })();
                break;
            case 'links':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideLinks(wikitext), wikitext]);
                })();
                break;
            case 'diagnostics':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideDiagnostics(wikitext), wikitext]);
                })();
                break;
            case 'completionItems':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideCompletionItems(wikitext, include), wikitext]);
                })();
                break;
            case 'references':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideReferences(wikitext, include), wikitext]);
                })();
                break;
            case 'definition':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideDefinition(wikitext, include), wikitext]);
                })();
                break;
            case 'renameLocation':
                (async () => {
                    postMessage([qid, await getLSP(qid).resolveRenameLocation(wikitext, include), wikitext]);
                })();
                break;
            case 'renameEdits':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideRenameEdits(wikitext, include, stage), wikitext]);
                })();
                break;
            case 'hover':
                (async () => {
                    postMessage([qid, await getLSP(qid).provideHover(wikitext, include), wikitext]);
                })();
                break;
            case 'signatureHelp':
                (async () => {
                    postMessage([qid, await getLSP(qid, true).provideSignatureHelp(wikitext, include), wikitext]);
                })();
        }
    };
};
const blob = new Blob([`(${String(workerJS).replace('$CDN', CDN)})()`], { type: 'text/javascript' }), url = URL.createObjectURL(blob), worker = new Worker(url);
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
const json = (wikitext, include, qid = -4, stage) => getFeedback('json', qid, false, wikitext, include, stage);
const print = (wikitext, include, stage, qid = -1) => getFeedback('print', qid, false, wikitext, include, stage);
const lint = (wikitext, include, qid = -2) => getFeedback('lint', qid, true, wikitext, include);
const provide = (command, qid, wikitext, ...args) => getFeedback(command, qid, typeof wikitext === 'string', wikitext, ...args);
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
const wikiparse = {
    version,
    CDN,
    id: 0,
    setI18N,
    setConfig,
    getConfig,
    print,
    lint,
    json,
    lineNumbers,
    provide,
};
Object.assign(window, { wikiparse });
})();
