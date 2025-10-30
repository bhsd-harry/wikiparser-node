declare interface Test {
	desc: string;
	wikitext?: string;
	html?: string;
	render?: string;
}

const ignoredGroups = new Set([
	// <ref>
	'bookReferencing',
	'citeParserTests',
	'citeSmokeTests',
	'fragmentModes',
	// magic words
	'magicWords',
	'extTags',
	'funcsParserTests',
	'stringFunctionTests',
	'parserFunctionTests',
]);

/**
 * 移除元素的指定类名
 * @param ele 元素
 * @param cls 类名
 */
const removeClass = (ele: Element, ...cls: string[]): void => {
	ele.classList.remove(...cls);
	if (ele.classList.length === 0) {
		ele.removeAttribute('class');
	}
};

(async () => {
	const tests: Test[] = await (await fetch('./test/parserTests.json')).json(),
		key = 'wikiparser-node-done',
		dones = new Set(JSON.parse(localStorage.getItem(key)!) as string[]),
		isGH = location.hostname.endsWith('.github.io'),
		isIframe = self !== top, // eslint-disable-line no-restricted-globals
		select = document.querySelector('select')!,
		btn = document.querySelector('button')!,
		pre = document.querySelector('pre')!,
		container = document.getElementById('frame')!,
		container1 = document.getElementById('frame1')!,
		container2 = document.getElementById('frame2')!;
	wikiparse.setConfig(await (await fetch('./config/default.json')).json() as import('./typings').ConfigData);
	await wikiparse.highlight!(pre, false, true);
	btn.disabled = !select.value;
	if (!isGH) {
		btn.style.display = '';
	}
	let optgroup: HTMLOptGroupElement | undefined;
	for (let i = 0; i < tests.length; i++) {
		const {desc, wikitext, html} = tests[i]!;
		if (wikitext === undefined) {
			if (optgroup && optgroup.childElementCount === 0) {
				optgroup.remove();
			}
			optgroup = document.createElement('optgroup');
			optgroup.label = desc;
			if (!isIframe || !ignoredGroups.has(desc)) {
				select.append(optgroup);
			}
		} else if ((isIframe || html !== undefined) && (isGH || !dones.has(desc))) {
			const option = document.createElement('option');
			option.value = String(i);
			option.textContent = desc;
			// @ts-expect-error already assigned
			optgroup.append(option);
		}
	}
	const dblClickHandler = /** @ignore */ (e?: MouseEvent): void => {
		e?.preventDefault();
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
	};
	select.addEventListener('change', () => {
		const {wikitext, html, render, desc} = tests[Number(select.value)]!;
		pre.textContent = wikitext!;
		pre.classList.remove('wikiparser');
		container.removeAttribute('data-source');
		if (html === undefined) {
			container.style.display = 'none';
		} else {
			container.style.display = '';
			container1.innerHTML = html!;
			container2.innerHTML = render ?? '';
			const classes = ['mw-default-size', 'mw-poem-indented', 'mw-html-heading'],
				withClasses = container1
					.querySelectorAll(classes.map(c => `.${c}`).join()) as unknown as Iterable<Element>,
				empty = container1.querySelectorAll('.mw-empty-elt') as unknown as Iterable<Element>,
				styles = container1
					.querySelectorAll('[style="/* insecure input */"]') as unknown as Iterable<Element>,
				typeofs = container1.querySelectorAll('span[typeof]') as unknown as Iterable<Element>,
				edits = container1
					.querySelectorAll('.mw-editsection') as unknown as Iterable<Element>,
				tocs = container1.querySelectorAll('#toc') as unknown as Iterable<Element>,
				anchors = container1.querySelectorAll('a[href]') as unknown as Iterable<HTMLAnchorElement>;
			for (const ele of withClasses) {
				removeClass(ele, ...classes);
			}
			for (const ele of empty) {
				if (ele.childElementCount === 0 && !ele.textContent.trim()) {
					removeClass(ele, 'mw-empty-elt');
				}
			}
			for (const ele of styles) {
				ele.removeAttribute('style');
			}
			for (const ele of typeofs) {
				ele.removeAttribute('typeof');
			}
			for (const ele of edits) {
				ele.remove();
			}
			for (const ele of tocs) {
				const {nextSibling} = ele;
				if (
					nextSibling?.nodeType === Node.TEXT_NODE
					&& nextSibling.textContent!.startsWith('\n\n')
				) {
					(nextSibling as Text).deleteData(0, 2);
				}
				ele.remove();
			}
			for (const ele of anchors) {
				ele.classList.remove('text', 'autonumber', 'mw-magiclink-pmid', 'mw-magiclink-rfc');
				try {
					const url = new URL(ele.href);
					if (ele.classList.contains('external')) {
						ele.href = url.href;
					} else if (
						url.origin === location.origin
						&& url.pathname === '/index.php'
						&& url.searchParams.has('title')
					) {
						url.pathname = `/wiki/${
							url.searchParams.get('title')!.replace(/:/gu, '%3A')
						}`;
						url.searchParams.delete('title');
						ele.setAttribute('href', url.pathname + url.search);
					}
				} catch {
					ele.removeAttribute('href');
				}
			}
			if (isIframe && container1.innerHTML === container2.innerHTML) {
				dblClickHandler();
			}
		}
		wikiparse.highlight!(pre, false, true);
		select.selectedOptions[0]!.disabled = true;
		btn.disabled = false;
		history.replaceState(null, '', `#${encodeURIComponent(desc)}`);
		dispatchEvent(new Event('casechange'));
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
	container.addEventListener('dblclick', dblClickHandler);
	addEventListener('hashchange', () => {
		const hash = decodeURIComponent(location.hash.slice(1)),
			i = tests.findIndex(({desc}) => desc === hash);
		if (i !== -1) {
			select.value = String(i);
			select.dispatchEvent(new Event('change'));
		}
	});
	dispatchEvent(new Event('hashchange'));
})();
