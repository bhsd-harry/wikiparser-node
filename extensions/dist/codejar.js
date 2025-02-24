(() => {
const codejar = (async () => {
    const { CodeJar } = 'CodeJar' in globalThis
        ? globalThis
        : await import('https://testingcf.jsdelivr.net/npm/codejar-async');
    return (textbox, include, linenums) => {
        var _a;
        if (!(textbox instanceof HTMLTextAreaElement)) {
            throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
        }
        const preview = document.createElement('div'), root = document.createElement('span'), { offsetHeight, selectionStart: start, selectionEnd: end, style: { height, paddingTop, paddingBottom, paddingLeft, paddingRight }, } = textbox;
        preview.className = 'wikiparser wikiparse-container';
        preview.tabIndex = 0;
        preview.style.height = offsetHeight ? `${offsetHeight}px` : height;
        preview.style.paddingTop = paddingTop;
        preview.style.paddingBottom = paddingBottom;
        root.className = 'wpb-root';
        root.style.paddingLeft = paddingLeft;
        root.style.paddingRight = paddingRight;
        preview.append(root);
        textbox.after(preview);
        textbox.style.display = 'none';
        preview.addEventListener('focus', () => {
            root.focus();
        });
        const id = wikiparse.id++;
        const highlight = async (e) => (await wikiparse.print(e.textContent, jar.include, undefined, id)).map(([, , printed]) => printed)
            .join('');
        const jar = {
            ...CodeJar(root, highlight, {
                spellcheck: true,
                autoclose: { open: '', close: '' },
            }),
            include: Boolean(include),
            editor: root,
        };
        if (linenums) {
            jar.onHighlight(e => {
                var _a;
                (_a = e.parentNode.querySelector('.wikiparser-line-numbers')) === null || _a === void 0 ? void 0 : _a.remove();
                wikiparse.lineNumbers(e, 1, paddingTop);
            });
        }
        jar.restore({ start: 0, end: 0 });
        jar.updateCode(textbox.value);
        jar.restore({ start, end });
        (_a = textbox.form) === null || _a === void 0 ? void 0 : _a.addEventListener('submit', () => {
            textbox.value = jar.toString();
        });
        return jar;
    };
})();
wikiparse.codejar = codejar;
(async () => {
    wikiparse.codejar = await codejar;
})();
})();
