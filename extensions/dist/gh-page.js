import { CodeMirror6 } from 'https://testingcf.jsdelivr.net/npm/@bhsd/codemirror-mediawiki@2.0.7/dist/main.min.js';
(async () => {
    const textbox = document.querySelector('#wpTextbox1'), textbox2 = document.querySelector('#wpTextbox2'), input = document.querySelector('#wpInclude'), buttons = document.getElementsByTagName('button'), tabcontents = document.getElementsByClassName('tabcontent'), { wikiparse } = window, config = await (await fetch('/wikiparser-node/config/default.json')).json();
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
    window.addEventListener('beforeunload', () => {
        instance.save();
    });
})();
