(() => {
    const MAX_STAGE = 11;
    const workerJS = () => {
        self.importScripts('https://testingcf.jsdelivr.net/gh/bhsd-harry/wikiparser-node@1.1.1-b/bundle/bundle.min.js');
        const { Parser } = self, entities = { '&': 'amp', '<': 'lt', '>': 'gt' };
        self.onmessage = ({ data }) => {
            var _a;
            const [command, qid, ...args] = data;
            switch (command) {
                case 'setI18N':
                    Parser.i18n = qid;
                    break;
                case 'setConfig':
                    Parser.config = qid;
                    break;
                case 'getConfig':
                    self.postMessage([qid, Parser.getConfig()]);
                    break;
                case 'lint':
                    self.postMessage([qid, Parser.parse(...args).lint(), args[0]]);
                    break;
                default: {
                    const stage = (_a = args[2]) !== null && _a !== void 0 ? _a : MAX_STAGE;
                    self.postMessage([
                        qid,
                        Parser.parse(...args).childNodes.map(child => [
                            stage,
                            String(child),
                            child.type === 'text'
                                ? String(child).replace(/[&<>]/gu, p => `&${entities[p]};`)
                                : child.print(),
                        ]),
                    ]);
                }
            }
        };
    };
    const blob = new Blob([`(${String(workerJS).replace(/MAX_STAGE/gu, String(MAX_STAGE))})()`], { type: 'text/javascript' }), url = URL.createObjectURL(blob), worker = new Worker(url);
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
    const getConfig = () => new Promise(resolve => {
        worker.addEventListener('message', getListener(-3, resolve));
        worker.postMessage(['getConfig', -3]);
    });
    const print = (wikitext, include, stage, qid = -1) => new Promise(resolve => {
        worker.addEventListener('message', getListener(qid, resolve));
        worker.postMessage(['print', qid, wikitext, include, stage]);
    });
    const lint = (wikitext, include, qid = -2) => new Promise(resolve => {
        worker.addEventListener('message', getListener(qid, resolve, wikitext));
        worker.postMessage(['lint', qid, wikitext, include]);
    });
    const wikiparse = { MAX_STAGE, id: 0, setI18N, setConfig, getConfig, print, lint };
    Object.defineProperty(wikiparse, 'MAX_STAGE', { enumerable: true, configurable: true });
    Object.assign(window, { wikiparse });
})();
