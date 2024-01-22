import { CodeMirror6 } from '/codemirror-mediawiki/dist/main.min.js';
const fromEntries = (entries, target) => {
    for (const entry of entries) {
        target[entry] = true;
    }
};
export const getMwConfig = (config) => {
    const mwConfig = {
        tags: {},
        tagModes: {
            ref: 'text/mediawiki',
        },
        doubleUnderscore: [{}, {}],
        functionSynonyms: [config.parserFunction[0], {}],
        urlProtocols: `${config.protocol}|//`,
        nsid: config.nsid,
    };
    fromEntries(config.ext, mwConfig.tags);
    fromEntries(config.doubleUnderscore[0].map(s => `__${s}__`), mwConfig.doubleUnderscore[0]);
    fromEntries(config.doubleUnderscore[1].map(s => `__${s}__`), mwConfig.doubleUnderscore[1]);
    fromEntries(config.parserFunction.slice(2).flat(), mwConfig.functionSynonyms[0]);
    fromEntries(config.parserFunction[1], mwConfig.functionSynonyms[1]);
    return mwConfig;
};
(async () => {
    if (!location.pathname.startsWith('/wikiparser-node')) {
        return;
    }
    const textbox = document.querySelector('#wpTextbox1'), textbox2 = document.querySelector('#wpTextbox2'), input = document.querySelector('#wpInclude'), input2 = document.querySelector('#wpHighlight'), buttons = document.getElementsByTagName('button'), tabcontents = document.querySelectorAll('.tabcontent'), astContainer = document.querySelector('#ast'), config = await (await fetch('./config/default.json')).json();
    wikiparse.setConfig(config);
    const printer = wikiparse.edit(textbox, input.checked), Linter = new wikiparse.Linter(input.checked), qid = wikiparse.id++, instance = new CodeMirror6(textbox2);
    instance.prefer([
        'highlightSpecialChars',
        'highlightWhitespace',
        'highlightTrailingWhitespace',
        'bracketMatching',
        'closeBrackets',
    ]);
    const update = (str) => {
        if (str) {
            textbox.value = str;
        }
        textbox.dispatchEvent(new Event('input'));
    };
    input.addEventListener('change', () => {
        printer.include = input.checked;
        Linter.include = input.checked;
        update();
        instance.update();
    });
    const mwConfig = getMwConfig(config);
    input2.addEventListener('change', () => {
        instance.setLanguage(input2.checked ? 'mediawiki' : 'plain', mwConfig);
        instance.lint((doc) => Linter.codemirror(String(doc)));
    });
    input2.dispatchEvent(new Event('change'));
    const transform = (type) => type && type.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
    const createAST = (ast) => {
        var _a;
        const entries = Object.entries(ast).filter(([key]) => key !== 'type' && key !== 'childNodes'), dl = document.createElement('dl'), dt = document.createElement('dt'), childNodes = document.createElement('dd'), dds = entries.map(([key, value]) => {
            const dd = document.createElement('dd'), code = document.createElement('code');
            code.textContent = typeof value === 'string' ? `"${value.replace(/[\\"]/gu, '\\$&')}"` : String(value);
            code.className = typeof value;
            dd.textContent = `${key}: `;
            dd.append(code);
            return dd;
        }), lbrace = document.createElement('span'), rbrace1 = document.createElement('span'), rbrace2 = document.createElement('span'), prop = document.createElement('span');
        dt.textContent = (_a = transform(ast.type)) !== null && _a !== void 0 ? _a : 'Text';
        dt.classList.add('inactive');
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
    const handler = (e) => {
        e.preventDefault();
        const active = document.querySelector('.active'), { currentTarget } = e, { value } = currentTarget;
        if (active === currentTarget) {
            return;
        }
        active.classList.remove('active');
        currentTarget.classList.add('active');
        if (value === 'editor') {
            update(instance.view.state.doc.toString());
        }
        else {
            instance.view.dispatch({ changes: { from: 0, to: instance.view.state.doc.length, insert: textbox.value } });
            instance.update();
        }
        for (const tabcontent of tabcontents) {
            tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
        }
        history.replaceState(null, '', `#${value}`);
    };
    for (const button of buttons) {
        if (button.value) {
            button.addEventListener('click', handler);
        }
    }
    if (location.hash === '#editor') {
        buttons[0].click();
    }
    window.addEventListener('hashchange', () => {
        switch (location.hash) {
            case '#editor':
                buttons[0].click();
                break;
            case '#linter':
                buttons[1].click();
        }
    });
    Object.assign(window, { cm: instance });
})();
