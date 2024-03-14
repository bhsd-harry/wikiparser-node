(async () => {
	const tests: {desc: string, print: string, html: string}[] = await (await fetch('./test/parserTests.json')).json(),
		select = document.querySelector('select')!,
		container = document.querySelector('.tab')!;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	select.append(...tests.map(({desc}, i) => {
		const option = document.createElement('option');
		option.value = String(i);
		option.textContent = desc;
		return option;
	}));
	select.addEventListener('change', () => {
		container.innerHTML = '';
		const {print, html} = tests[Number(select.value)]!;
		const pre = document.createElement('pre');
		pre.className = 'wikiparser tests';
		pre.innerHTML = print;
		container.prepend(pre);
		const section = document.createElement('div');
		section.innerHTML = html;
		container.append(section);
	});
})();
