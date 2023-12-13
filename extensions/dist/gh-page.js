import { CodeMirror6 } from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.6/dist/main.min.js';
(async () => {
    const textbox = document.querySelector('#wpTextbox1'), input = document.querySelector('#wpInclude1'), { wikiparse } = window, config = await (await fetch('/wikiparser-node/config/default.json')).json();
    wikiparse.setConfig(config);
    const printer = wikiparse.edit(textbox, input.checked);
    input.addEventListener('change', () => {
        printer.include = input.checked;
        textbox.dispatchEvent(new Event('input'));
    });
    const textbox2 = document.querySelector('#wpTextbox2'), input2 = document.querySelector('#wpInclude2'), instance = new CodeMirror6(textbox2), Linter = new wikiparse.Linter(input2.checked);
    instance.lint((view) => Linter.codemirror(view.state.doc.toString()));
    input.addEventListener('change', () => {
        Linter.include = input.checked;
        instance.update();
    });
})();
(() => {
    const tabcontents = document.getElementsByClassName('tabcontent');
    const handler = (e) => {
        var _a;
        (_a = document.querySelector('.active')) === null || _a === void 0 ? void 0 : _a.classList.remove('active');
        const { currentTarget } = e, { value } = currentTarget;
        currentTarget.classList.add('active');
        for (const tabcontent of tabcontents) {
            tabcontent.style.display = tabcontent.id === value ? 'block' : 'none';
        }
    };
    for (const button of document.getElementsByTagName('button')) {
        if (button.value) {
            button.addEventListener('click', handler);
        }
    }
})();
