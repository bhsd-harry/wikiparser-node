(() => {
importScripts('../../bundle/bundle.es7.js');
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
    }
};
})();
