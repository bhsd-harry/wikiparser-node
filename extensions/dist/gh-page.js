import { CodeMirror6 } from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.6/dist/main.min.js';
(async () => {
    const textbox = document.querySelector('#wpTextbox1'), textbox2 = document.querySelector('#wpTextbox2'), input = document.querySelector('#wpInclude'), tabcontents = document.getElementsByClassName('tabcontent'), { wikiparse } = window, config = await (await fetch('/wikiparser-node/config/default.json')).json();
    wikiparse.setConfig(config);
    const printer = wikiparse.edit(textbox, input.checked), Linter = new wikiparse.Linter(input.checked), instance = new CodeMirror6(textbox2);
    instance.lint((view) => Linter.codemirror(view.state.doc.toString()));
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
    const handler = (e) => {
        e.preventDefault();
        const active = document.querySelector('.active'), { currentTarget } = e, { value } = currentTarget;
        if (active === currentTarget) {
            return;
        }
        active.classList.remove('active');
        currentTarget.classList.add('active');
        if (value === 'tabcontent1') {
            update(instance.view.state.doc.toString());
        }
        else {
            instance.view.dispatch({ changes: { from: 0, to: instance.view.state.doc.length, insert: textbox.value } });
            instance.update();
        }
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
