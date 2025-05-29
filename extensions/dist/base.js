(() => {
var _a;
const version = '1.21.0', src = (_a = document.currentScript) === null || _a === void 0 ? void 0 : _a.src, file = /\/extensions\/dist\/base\.(?:min\.)?js$/u, CDN = src && file.test(src)
    ? src.replace(file, '')
    : `https://testingcf.jsdelivr.net/npm/wikiparser-node@${version}`;
const workerJS = () => {
    importScripts('$CDN/bundle/bundle-lsp.min.js');
    const entities = { '&': 'amp', '<': 'lt', '>': 'gt' }, lsps = new Map(), last = { include: true };
    const parse = (wikitext, include = false, stage) => {
        if (stage === undefined && last.wikitext === wikitext && last.include === include) {
            return last.root;
        }
        const root = Parser.parse(wikitext, include, stage);
        if (stage === undefined) {
            last.wikitext = wikitext;
            last.include = include;
            last.root = root;
        }
        return root;
    };
    const getLSP = (id, include = true) => {
        if (lsps.has(id)) {
            return lsps.get(id);
        }
        const lsp = Parser.createLanguageService({});
        lsp.include = include;
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
                parseInt((short ? s.charAt(4).repeat(2) : s.slice(7, 9)) || 'ff', 16)
                    / 255,
            ];
        }
        const values = s.slice(s.indexOf('(') + 1, -1).trim()
            .split(/\s+(?:[,/]\s*)?|[,/]\s*/u)
            .map(v => parseFloat(v) / (v.endsWith('%') ? 100 : 1));
        return [
            values[0],
            values[1],
            values[2],
            (_a = values[3]) !== null && _a !== void 0 ? _a : 1,
        ];
    };
    self.onmessage = ({ data }) => {
        const [command, qid, wikitext, include, stage, newName] = data;
        switch (command) {
            case 'setI18N':
                Parser.i18n = qid;
                break;
            case 'setConfig':
                Parser.config = qid;
                delete last.wikitext;
                break;
            case 'getConfig':
                postMessage([command, qid, Parser.getConfig()]);
                break;
            case 'json':
                postMessage([command, qid, parse(wikitext, include, stage).json()]);
                break;
            case 'lint':
                postMessage([command, qid, parse(wikitext, include).lint(), wikitext]);
                break;
            case 'print':
                postMessage([
                    command,
                    qid,
                    parse(wikitext, include, stage).childNodes.map(child => [
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
                lsps.delete(qid);
                break;
            case 'data':
                getLSP(qid, include).data = wikitext;
                break;
            case 'colorPresentations':
                postMessage([command, qid, getLSP(qid, include).provideColorPresentations(wikitext)]);
                break;
            case 'documentColors':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideDocumentColors(parseColor, wikitext, false),
                        wikitext,
                    ]);
                })();
                break;
            case 'foldingRanges':
                (async () => {
                    postMessage([command, qid, await getLSP(qid, include).provideFoldingRanges(wikitext), wikitext]);
                })();
                break;
            case 'links':
                (async () => {
                    postMessage([command, qid, await getLSP(qid, include).provideLinks(wikitext), wikitext]);
                })();
                break;
            case 'diagnostics':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideDiagnostics(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'completionItems':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideCompletionItems(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'references':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideReferences(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'definition':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideDefinition(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'renameLocation':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).resolveRenameLocation(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'renameEdits':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideRenameEdits(wikitext, stage, newName),
                        wikitext,
                    ]);
                })();
                break;
            case 'hover':
                (async () => {
                    postMessage([command, qid, await getLSP(qid, include).provideHover(wikitext, stage), wikitext]);
                })();
                break;
            case 'signatureHelp':
                (async () => {
                    postMessage([
                        command,
                        qid,
                        await getLSP(qid, include).provideSignatureHelp(wikitext, stage),
                        wikitext,
                    ]);
                })();
                break;
            case 'inlayHints':
                (async () => {
                    postMessage([command, qid, await getLSP(qid, include).provideInlayHints(wikitext), wikitext]);
                })();
                break;
            case 'findStyleTokens':
                postMessage([command, qid, getLSP(qid).findStyleTokens().map(token => token.json())]);
        }
    };
};
const blob = new Blob([`(${String(workerJS).replace('$CDN', CDN)})()`], { type: 'text/javascript' }), url = URL.createObjectURL(blob), worker = new Worker(url);
URL.revokeObjectURL(url);
const getListener = (command, qid, resolve, raw) => {
    const listener = ({ data: [cmd, rid, res, resRaw] }) => {
        if (cmd === command && rid === qid && (raw === undefined || raw === resRaw)) {
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
    wikiparse.config = config;
};
const getFeedback = (command, qid, strict, raw, ...args) => new Promise(resolve => {
    worker.addEventListener('message', getListener(command, qid, resolve, strict ? raw : undefined));
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
        const lines = child.nodeType === Node.TEXT_NODE
            ? textContent.split('\n')
            : splitNewLine(child);
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
    const container = html.parentElement, { isContentEditable } = html, { clientHeight } = container, gutter = getGutter(container);
    if (!gutter) {
        intersectionObserver.unobserve(html);
        return;
    }
    html.style.marginLeft = '';
    const start = Number(html.dataset['start'] || 1), lines = splitNewLine(html), width = `${String(lines.length + start - 1).length + 1.5}ch`;
    html.style.marginLeft = width;
    gutter.style.width = width;
    if (isContentEditable) {
        gutter.style.minHeight = `${clientHeight + 1}px`;
    }
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
        if (!isContentEditable && html.offsetHeight <= clientHeight) {
            line.style.height = `${container.getBoundingClientRect().top + container.scrollHeight - lastTop}px`;
            container.style.overflowY = 'hidden';
        }
        else {
            line.style.height = `${html.getBoundingClientRect().bottom - lastTop}px`;
            if (!isContentEditable) {
                container.style.overflowY = '';
            }
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
const lineNumbers = (html, start = 1, paddingTop = '', paddingBottom = '') => {
    const container = html.parentElement, gutter = document.createElement('span');
    html.dataset['start'] = String(start);
    gutter.className = 'wikiparser-line-numbers';
    gutter.style.paddingTop = paddingTop;
    gutter.style.paddingBottom = paddingBottom;
    container.classList.add('wikiparse-container');
    container.append(gutter);
    if (html.isContentEditable) {
        html.style.paddingBottom = `${container.clientHeight}px`;
    }
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
    config: {},
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
