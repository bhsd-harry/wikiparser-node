(() => {
    const MAX_STAGE = 11;
    /** web worker */
    const workerJS = () => {
        self.importScripts('https://fastly.jsdelivr.net/gh/bhsd-harry/wikiparser-node@browser/bundle/bundle.min.js');
        const { Parser } = self, entities = { '&': 'amp', '<': 'lt', '>': 'gt' };
        /** @implements */
        self.onmessage = ({ data }) => {
            const [command, qid, ...args] = data;
            switch (command) {
                case 'setI18N':
                    Parser.i18n = qid;
                    break;
                case 'setConfig':
                    Parser.config = qid;
                    break;
                case 'getConfig':
                    self.postMessage([qid, Parser.minConfig]);
                    break;
                case 'lint':
                    self.postMessage([qid, Parser.parse(...args).lint(), args[0]]);
                    break;
                // case 'print':
                default: {
                    const stage = args[2] === undefined ? MAX_STAGE : args[2];
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
    /**
     * 生成事件监听函数
     * @param qid 输入id
     * @param resolve Promise对象的resolve函数
     * @param raw 原始文本
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getListener = (qid, resolve, raw) => {
        /**
         * 事件监听函数
         * @param {{data: [number, unknown, string]}} e 消息事件
         */
        const listener = ({ data: [rid, res, resRaw] }) => {
            if (rid === qid && (raw === undefined || raw === resRaw)) {
                worker.removeEventListener('message', listener);
                resolve(res);
            }
        };
        return listener;
    };
    /**
     * 更新I18N消息
     * @param i18n I18N消息
     */
    const setI18N = (i18n) => {
        worker.postMessage(['setI18N', i18n]);
    };
    /**
     * 更新解析设置
     * @param config 设置
     */
    const setConfig = (config) => {
        worker.postMessage(['setConfig', config]);
    };
    /** 获取Parser.minConfig */
    const getConfig = () => new Promise(resolve => {
        worker.addEventListener('message', getListener(-3, resolve));
        worker.postMessage(['getConfig', -3]);
    });
    /**
     * 将解析改为异步执行
     * @param wikitext wikitext
     * @param include 是否嵌入
     * @param stage 解析层级
     * @param qid Printer编号
     */
    const print = (wikitext, include, stage, qid = -1) => new Promise(resolve => {
        worker.addEventListener('message', getListener(qid, resolve));
        worker.postMessage(['print', qid, wikitext, include, stage]);
    });
    /**
     * 将语法分析改为异步执行
     * @param wikitext wikitext
     * @param include 是否嵌入
     * @param qid Linter编号，暂时固定为`-2`
     */
    const lint = (wikitext, include, qid = -2) => new Promise(resolve => {
        worker.addEventListener('message', getListener(qid, resolve, wikitext));
        worker.postMessage(['lint', qid, wikitext, include]);
    });
    const wikiparse = { MAX_STAGE, id: 0, setI18N, setConfig, getConfig, print, lint };
    Object.defineProperty(wikiparse, 'MAX_STAGE', { enumerable: true, configurable: true });
    Object.assign(window, { wikiparse });
})();
