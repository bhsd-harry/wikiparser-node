import { CodeMirror6 } from '/codemirror-mediawiki/dist/main.min.js';
import '/monaco-wiki/all.min.js';
const transform = (type) => type && type.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
const keys = new Set(['type', 'childNodes', 'range']);
(async () => {
    const textbox = document.querySelector('#wpTextbox1'), textbox2 = document.querySelector('#wpTextbox2'), monacoContainer = document.getElementById('monaco-container'), input = document.querySelector('#wpInclude'), input2 = document.querySelector('#wpHighlight'), h2 = document.querySelector('h2'), buttons = [...document.querySelectorAll('.tab > button')], tabcontents = document.querySelectorAll('.tabcontent'), astContainer = document.getElementById('ast'), highlighters = document.getElementById('highlighter').children, pres = [...document.getElementsByClassName('highlight')];
    const config = await (await fetch('./config/default.json')).json();
    Parser.config = config;
    wikiparse.setConfig(config);
    const immediatePrint = (wikitext, include, stage) => Promise.resolve([[stage !== null && stage !== void 0 ? stage : Infinity, wikitext, Parser.parse(wikitext, include, stage).print()]]);
    const printer = wikiparse.edit(textbox, input.checked), Linter = new wikiparse.Linter(input.checked), { print } = wikiparse, qid = wikiparse.id++;
    highlighters[1 - Number(input.checked)].style.display = 'none';
    const instance = new CodeMirror6(textbox2), mwConfig = CodeMirror6.getMwConfig(config);
    localStorage.setItem('codemirror-mediawiki-addons', JSON.stringify(['lint']));
    const model = (await monaco).editor.createModel(textbox2.value, 'wikitext');
    monaco.editor.create(monacoContainer, {
        model,
        automaticLayout: true,
        theme: 'monokai',
        readOnly: true,
        wordWrap: 'on',
        wordBreak: 'keepAll',
        renderValidationDecorations: 'on',
        glyphMargin: true,
        fontSize: parseFloat(getComputedStyle(textbox2).fontSize),
        unicodeHighlight: {
            ambiguousCharacters: false,
        },
    });
    textbox2.addEventListener('input', () => {
        model.setValue(textbox2.value);
    });
    const updateDoc = (str) => {
        if (str) {
            textbox.value = str;
        }
        textbox.dispatchEvent(new Event('input'));
    };
    input.addEventListener('change', () => {
        const { checked } = input;
        printer.include = checked;
        Linter.include = checked;
        updateDoc();
        instance.update();
        highlighters[Number(checked)].style.display = '';
        highlighters[1 - Number(checked)].style.display = 'none';
    });
    const setLang = () => {
        instance.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
        instance.lint((doc) => Linter.codemirror(String(doc)));
    };
    setLang();
    input2.addEventListener('change', setLang);
    const createAST = (ast) => {
        var _a;
        const entries = Object.entries(ast).filter(([key]) => !keys.has(key)), dl = document.createElement('dl'), dt = document.createElement('dt'), childNodes = document.createElement('dd'), dds = entries.map(([key, value]) => {
            const dd = document.createElement('dd'), code = document.createElement('code');
            code.textContent = typeof value === 'string' ? `"${value.replace(/[\\"]/gu, '\\$&')}"` : String(value);
            code.className = typeof value;
            dd.textContent = `${key}: `;
            dd.append(code);
            return dd;
        }), lbrace = document.createElement('span'), rbrace1 = document.createElement('span'), rbrace2 = document.createElement('span'), prop = document.createElement('span');
        dt.textContent = (_a = transform(ast.type)) !== null && _a !== void 0 ? _a : 'Text';
        dt.className = 'inactive';
        dl.dataset['start'] = String(ast.range[0]);
        dl.dataset['end'] = String(ast.range[1]);
        if ('childNodes' in ast) {
            childNodes.append(...ast.childNodes.map(createAST));
        }
        lbrace.textContent = ' { ';
        rbrace1.textContent = ' }';
        rbrace2.textContent = '}';
        prop.textContent = entries.map(([key]) => key).join(', ');
        dt.append(lbrace, prop, rbrace1);
        dl.append(dt, ...dds, childNodes, rbrace2);
        return dl;
    };
    let timer;
    textbox.addEventListener('input', e => {
        if (!e.isComposing) {
            clearTimeout(timer);
            timer = window.setTimeout((async () => {
                const astDom = createAST(await wikiparse.json(textbox.value, printer.include, qid));
                astDom.children[0].classList.remove('inactive');
                astContainer.innerHTML = '';
                astContainer.append(astDom);
            }), 2000);
        }
    });
    astContainer.addEventListener('click', ({ target }) => {
        var _a;
        (_a = target.closest('dt')) === null || _a === void 0 ? void 0 : _a.classList.toggle('inactive');
    });
    const nodeMap = new WeakMap();
    let curNode, curDl;
    const updateHover = (nextNode) => {
        if (curNode !== nextNode) {
            curNode === null || curNode === void 0 ? void 0 : curNode.classList.remove('hover');
            nextNode === null || nextNode === void 0 ? void 0 : nextNode.classList.add('hover');
            curNode = nextNode;
        }
    };
    const findNode = (start, end) => {
        if (start === end) {
            return undefined;
        }
        let cur = document.getElementById('wikiPretty').firstChild;
        while (cur) {
            const { length } = cur.textContent;
            if (start >= length) {
                cur = cur.nextSibling;
                start -= length;
                end -= length;
            }
            else if (end > length || cur.nodeType === Node.TEXT_NODE) {
                return undefined;
            }
            else if (start === 0 && end === length) {
                return cur;
            }
            else {
                cur = cur.firstChild;
            }
        }
        return undefined;
    };
    astContainer.addEventListener('mouseover', ({ target }) => {
        const dl = target.closest('dl');
        if (dl !== curDl) {
            curDl === null || curDl === void 0 ? void 0 : curDl.classList.remove('hover');
            dl === null || dl === void 0 ? void 0 : dl.classList.add('hover');
            curDl = dl;
        }
        if (!dl) {
            updateHover(undefined);
            return;
        }
        let nextNode = nodeMap.get(dl);
        if (nextNode === null || nextNode === void 0 ? void 0 : nextNode.isConnected) {
            updateHover(nextNode);
            return;
        }
        const start = Number(dl.dataset['start']), end = Number(dl.dataset['end']);
        nextNode = findNode(start, end);
        nodeMap.set(dl, nextNode);
        updateHover(nextNode);
    });
    const switchTab = function (e) {
        e.preventDefault();
        const active = document.querySelector('.active'), { value } = this;
        if (active === this) {
            return;
        }
        active.classList.remove('active');
        this.classList.add('active');
        h2.textContent = `Please input wikitext into the text box ${value === 'highlighter' ? 'under the first tab' : 'below'}.`;
        for (const tabcontent of tabcontents) {
            tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
        }
        const text1 = textbox.value, text2 = instance.view.state.doc.toString();
        switch (active.value) {
            case 'linter':
                if (text1 !== text2) {
                    updateDoc(text2);
                }
                break;
            case 'highlighter':
                wikiparse.print = print;
        }
        switch (value) {
            case 'linter':
                if (text1 !== text2) {
                    instance.view.dispatch({ changes: { from: 0, to: text2.length, insert: text1 } });
                    model.setValue(text1);
                    instance.update();
                }
                break;
            case 'highlighter':
                (async () => {
                    wikiparse.print = immediatePrint;
                    for (const [i, pre] of pres.entries()) {
                        pre.classList.remove('wikiparser');
                        pre.textContent = textbox.value;
                        await wikiparse.highlight(pre, Boolean(i), true);
                    }
                })();
        }
        history.replaceState(null, '', `#${value}`);
    };
    for (const button of buttons.slice(0, -1)) {
        button.addEventListener('click', switchTab);
    }
    const hashchange = () => {
        var _a;
        (_a = buttons.find(({ value }) => value === location.hash.slice(1))) === null || _a === void 0 ? void 0 : _a.click();
    };
    hashchange();
    window.addEventListener('hashchange', hashchange);
    Object.assign(window, { cm: instance, model });
})();
