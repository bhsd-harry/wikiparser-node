/* eslint jsdoc/require-jsdoc: 0 */
import type {CodeJar as Jar, CodeJarAsync, codejar as f} from './typings';

const codejar = (async (): Promise<f> => {
	const {CodeJar}: {CodeJar: typeof Jar} = 'CodeJar' in globalThis
		? globalThis
		: await import('https://fastly.jsdelivr.net/npm/codejar-async');

	return (textbox: HTMLTextAreaElement, include?: boolean, linenums?: boolean): CodeJarAsync => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse.codejar方法仅可用于textarea元素！');
		}
		const preview = document.createElement('div'),
			root = document.createElement('span'),
			{
				offsetHeight,
				selectionStart: start,
				selectionEnd: end,
				style: {height, paddingTop, paddingBottom, paddingLeft, paddingRight},
			} = textbox;
		preview.className = 'wikiparser wikiparse-container';
		preview.tabIndex = 0;
		preview.style.height = offsetHeight ? `${offsetHeight}px` : height;
		preview.style.paddingTop = paddingTop;
		preview.style.paddingBottom = paddingBottom;
		root.className = 'wpb-root';
		root.style.paddingLeft = paddingLeft;
		root.style.paddingRight = paddingRight;
		preview.append(root);
		textbox.after(preview);
		textbox.style.display = 'none';
		preview.addEventListener('focus', () => {
			root.focus();
		});

		const id = wikiparse.id++;
		/** @implements */
		const highlight = async (e: HTMLElement): Promise<string> =>
			(await wikiparse.print(e.textContent, jar.include, undefined, id)).map(([,, printed]) => printed)
				.join('');
		const jar = {
			...CodeJar(root, highlight, { // eslint-disable-line new-cap
				spellcheck: true,
				autoclose: {open: '', close: ''},
			}),
			include: Boolean(include),
			editor: root,
		};
		if (linenums) {
			jar.onHighlight(e => {
				e.parentNode!.querySelector('.wikiparser-line-numbers')?.remove();
				wikiparse.lineNumbers(e, 1, paddingTop, paddingBottom);
			});
		}
		jar.restore({start: 0, end: 0});
		jar.updateCode(textbox.value);
		jar.restore({start, end});
		textbox.form?.addEventListener('submit', () => {
			textbox.value = jar.toString();
		});
		return jar;
	};
})();

wikiparse.codejar = codejar;
(async () => {
	wikiparse.codejar = await codejar;
})();
