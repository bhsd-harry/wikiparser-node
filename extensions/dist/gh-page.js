import { CodeMirror6 } from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.5/dist/main.min.js';
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
    });
})();
