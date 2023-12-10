(() => {
(async () => {
    const textbox = document.querySelector('#wpTextbox'), input = document.querySelector('#wpInclude'), { wikiparse } = window, config = await (await fetch('https://bhsd-harry.github.io/wikiparser-node/config/default.json')).json();
    wikiparse.setConfig(config);
    const printer = wikiparse.edit(textbox, input.checked);
    input.addEventListener('change', () => {
        printer.include = input.checked;
        textbox.dispatchEvent(new Event('input'));
    });
})();
})();
