declare interface Test {
	desc: string;
	wikitext?: string;
	html?: string;
	render?: string;
}

(async () => {
	const tests: Test[] = await (await fetch('./test/parserTests.json')).json(),
		key = 'wikiparser-node-done',
		dones = new Set<string>(JSON.parse(localStorage.getItem(key)!) as string[]),
		select = document.querySelector('select')!,
		btn = document.querySelector('button')!,
		pre = document.querySelector('pre')!,
		container = document.getElementById('frame')!,
		container1 = document.getElementById('frame1')!,
		container2 = document.getElementById('frame2')!;
	Parser.config = await (await fetch('./config/default.json')).json();
	/** @implements */
	wikiparse.print = (wikitext, include, stage): Promise<[number, string, string][]> => {
		const printed = Parser.parse(wikitext, include, stage).print();
		return Promise.resolve([[stage ?? Infinity, wikitext, printed]]);
	};
	wikiparse.highlight!(pre, false, true);
	btn.disabled = !select.value;
	let optgroup: HTMLOptGroupElement;
	for (const [i, {desc, wikitext, html}] of tests.entries()) {
		if (wikitext === undefined) {
			optgroup = document.createElement('optgroup');
			optgroup.label = desc;
			select.append(optgroup);
		} else if (html !== undefined && !dones.has(desc)) {
			const option = document.createElement('option');
			option.value = String(i);
			option.textContent = desc;
			// @ts-expect-error already assigned
			optgroup.append(option);
		}
	}
	select.addEventListener('change', () => {
		const {wikitext, html, render} = tests[Number(select.value)]!;
		pre.textContent = wikitext!;
		pre.classList.remove('wikiparser');
		container.removeAttribute('data-source');
		container1.innerHTML = html!;
		container2.innerHTML = render ?? '';
		wikiparse.highlight!(pre, false, true);
		select.selectedOptions[0]!.disabled = true;
		btn.disabled = false;
	});
	btn.addEventListener('click', () => {
		dones.add(tests[Number(select.value)]!.desc);
		localStorage.setItem(key, JSON.stringify([...dones]));
		while (select.selectedOptions[0]!.disabled) {
			select.selectedIndex++;
		}
		select.dispatchEvent(new Event('change'));
	});
	container.addEventListener('click', e => {
		e.preventDefault();
	}, {capture: true});
	container.addEventListener('dblclick', e => {
		e.preventDefault();
		if (container.dataset['source']) {
			container.removeAttribute('data-source');
			container1.innerHTML = container1.textContent!;
			container2.innerHTML = container2.textContent!;
		} else {
			container.dataset['source'] = '1';
			const pre1 = document.createElement('pre'),
				pre2 = document.createElement('pre'),
				code1 = document.createElement('code'),
				code2 = document.createElement('code');
			code1.textContent = container1.innerHTML;
			code2.textContent = container2.innerHTML;
			pre1.className = 'language-html';
			pre2.className = 'language-html';
			pre1.append(code1);
			pre2.append(code2);
			container1.replaceChildren(pre1);
			container2.replaceChildren(pre2);
			Prism.highlightAllUnder(container);
		}
	});
})();
