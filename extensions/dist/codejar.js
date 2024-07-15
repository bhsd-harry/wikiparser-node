(() => {
const codejar = (async () => {
    const { CodeJar } = 'CodeJar' in window
        ? window
        : await import('https://testingcf.jsdelivr.net/npm/codejar-async');
    return (textbox, include) => {
        var _a;
        if (!(textbox instanceof HTMLTextAreaElement)) {
            throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
        }
        const preview = document.createElement('div'), root = document.createElement('span'), { offsetHeight, style: { height }, selectionStart: start, selectionEnd: end } = textbox;
        preview.className = 'wikiparser wikiparse-container';
        preview.style.height = offsetHeight ? `${offsetHeight}px` : height;
        root.className = 'wpb-root';
        preview.append(root);
        textbox.after(preview);
        textbox.style.display = 'none';
        const id = wikiparse.id++;
        const highlight = async (e) => (await wikiparse.print(e.textContent, jar.include, undefined, id)).map(([, , printed]) => printed).join('');
        const jar = {
            ...CodeJar(root, highlight, { spellcheck: true }),
            include: Boolean(include),
        };
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
