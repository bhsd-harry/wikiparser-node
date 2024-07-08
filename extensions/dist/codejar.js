import { CodeJar as codeJar } from 'https://testingcf.jsdelivr.net/npm/codejar';
const transform = (type) => type && type.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
const keys = new Set(['type', 'childNodes', 'range']);
(async () => {
    const textbox = document.querySelector('#wpTextbox1'), input = document.querySelector('#wpInclude'), astContainer = document.getElementById('ast');
    const config = await (await fetch('./config/default.json')).json();
    Parser.config = config;
    const highlight = (editor) => {
        const root = Parser.parse(editor.textContent, input.checked);
        editor.innerHTML = root.print();
        const astDom = createAST(root.json());
        astDom.children[0].classList.remove('inactive');
        astContainer.replaceChildren(astDom);
    };
    codeJar(textbox, highlight, {
        indentOn: /^o^/u,
        moveToNewLine: /^o^/u,
        spellcheck: true,
    });
    input.addEventListener('change', () => {
        highlight(textbox);
    });
    let curNode, curDl;
    const createAST = (ast) => {
        var _a;
        const entries = Object.entries(ast).filter(([key]) => !keys.has(key)), dl = document.createElement('dl'), dt = document.createElement('dt'), childNodes = document.createElement('dd'), dds = entries.map(([key, value]) => {
            const dd = document.createElement('dd'), code = document.createElement('code');
            code.textContent = typeof value === 'string'
                ? `"${value.replace(/[\\"]/gu, String.raw `\$&`)}"`
                : String(value);
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
        let cur = textbox.firstChild;
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
    const nodeMap = new WeakMap();
    astContainer.addEventListener('click', ({ target }) => {
        var _a;
        (_a = target.closest('dt')) === null || _a === void 0 ? void 0 : _a.classList.toggle('inactive');
    });
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
})();
