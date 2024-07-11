(() => {
const codejar = (async () => {
    const { CodeJar } = await import('https://testingcf.jsdelivr.net/npm/codejar-async');
    return (textbox, include) => {
        var _a;
        if (!(textbox instanceof HTMLTextAreaElement)) {
            throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
        }
        const preview = document.createElement('div'), container = document.createElement('div'), { offsetHeight, style: { height }, selectionStart: start, selectionEnd: end } = textbox;
        preview.id = 'wikiPretty';
        preview.classList.add('wikiparser');
        container.className = 'wikiparse-container';
        container.style.height = offsetHeight ? `${offsetHeight}px` : height;
        textbox.replaceWith(container);
        textbox.classList.add('wikiparsed');
        textbox.style.visibility = 'hidden';
        container.append(preview, textbox);
        const id = wikiparse.id++;
        const highlight = async (e) => (await wikiparse.print(e.textContent, jar.include, undefined, id)).map(([, , printed]) => printed).join('');
        const jar = {
            ...CodeJar(preview, highlight, { spellcheck: true }),
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
