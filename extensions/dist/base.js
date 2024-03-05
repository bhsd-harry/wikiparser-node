(() => {
const workerJS = () => {
    importScripts('https://testingcf.jsdelivr.net/npm/wikiparser-node@1.5.4-b/bundle/bundle.min.js');
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
const json = (wikitext, include, qid) => getFeedback('json', qid, false, wikitext, include);
const print = (wikitext, include, stage, qid = -1) => getFeedback('print', qid, false, wikitext, include, stage);
const lint = (wikitext, include, qid = -2) => getFeedback('lint', qid, true, wikitext, include);
const wikiparse = { id: 0, setI18N, setConfig, getConfig, print, lint, json };
Object.assign(window, { wikiparse });
})();
