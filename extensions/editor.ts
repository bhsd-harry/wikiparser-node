import type {wikiparse} from './typings';

(() => {
	const {wikiparse} = window as unknown as {wikiparse: wikiparse},
		{MAX_STAGE} = wikiparse;

	/** 用于打印AST */
	class Printer {
		/* eslint-disable es-x/no-class-fields */
		declare private id;
		declare include;
		declare private preview;
		declare private textbox;
		declare private root: [number, string, string][];
		declare running: Promise<void> | undefined;
		declare private viewportChanged: boolean;
		declare ticks: [number, 'coarsePrint' | 'finePrint' | undefined];
		/* eslint-enable es-x/no-class-fields */

		/**
		 * @param preview 置于下层的代码高亮
		 * @param textbox 置于上层的文本框
		 * @param include 是否嵌入
		 */
		constructor(preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) {
			this.id = wikiparse.id++;
			this.include = Boolean(include);
			this.preview = preview;
			this.textbox = textbox;
			this.root = [];
			this.running = undefined;
			this.viewportChanged = false;
			this.ticks = [0, undefined];
		}

		/** 倒计时 */
		private tick(): void {
			setTimeout(() => {
				const {ticks} = this;
				if (ticks[0] > 0) {
					ticks[0] -= 500;
					this[ticks[0] <= 0 ? ticks[1]! : 'tick']();
				}
			}, 500);
		}

		/**
		 * 用于debounce
		 * @param delay 延迟
		 * @param method 方法
		 */
		queue(delay: number, method: 'coarsePrint' | 'finePrint'): void {
			const {ticks} = this,
				[state] = ticks;
			if (state <= 0 || method === 'coarsePrint' || ticks[1] !== 'coarsePrint') {
				ticks[0] = delay;
				ticks[1] = method;
				if (state <= 0) {
					this.tick();
				}
			}
		}

		/** 渲染 */
		private paint(): void {
			this.preview.innerHTML = `<span class="wpb-root">${
				this.root.map(([,, printed]) => printed).join('')
			}</span> `;
			this.preview.scrollTop = this.textbox.scrollTop;
			this.preview.classList.remove('active');
			this.textbox.style.color = 'transparent';
		}

		/** 初步解析 */
		async coarsePrint(): Promise<void> {
			if (this.running) {
				return undefined;
			}
			const {include, textbox: {value}} = this,
				parsed = await wikiparse.print(value, include, 2, this.id);
			if (this.include !== include || this.textbox.value !== value) {
				this.running = undefined;
				this.running = this.coarsePrint();
				return this.running;
			}
			this.root = parsed;
			this.paint();
			this.running = undefined;
			this.running = this.finePrint();
			return this.running;
		}

		/** 根据可见范围精细解析 */
		private async finePrint(): Promise<void> {
			if (this.running) {
				this.viewportChanged = true;
				return undefined;
			}
			this.viewportChanged = false;
			const {
				root,
				preview: {scrollHeight, offsetHeight: parentHeight, scrollTop, children: [rootNode]},
				include,
				textbox: {value},
			} = this;
			let text = value,
				start = 0,
				{length: end} = root;
			if (scrollHeight > parentHeight) {
				const childNodes = [...rootNode!.childNodes] as HTMLElement[],
					headings = childNodes.filter(({className}) => className === 'wpb-heading'),
					{length} = headings;
				if (length > 0) {
					let i = headings.findIndex(({offsetTop, offsetHeight}) => offsetTop + offsetHeight > scrollTop);
					i = i === -1 ? length : i;
					let j = headings.slice(i).findIndex(({offsetTop}) => offsetTop >= scrollTop + parentHeight);
					j = j === -1 ? length : i + j;
					start = i ? childNodes.indexOf(headings[i - 1]!) : 0;
					while (i <= j && root[start]![0] === MAX_STAGE) {
						start = childNodes.indexOf(headings[i++]!);
					}
					end = j === length ? end : childNodes.indexOf(headings[j]!);
					while (i <= j && root[end - 1]![0] === MAX_STAGE) {
						end = childNodes.indexOf(headings[--j]!);
					}
					text = root.slice(start, end).map(([, str]) => str).join('');
				}
			}
			if (start === end) {
				this.running = undefined;
				return undefined;
			}
			const parsed = await wikiparse.print(text, include, MAX_STAGE, this.id);
			if (this.include === include && this.textbox.value === value) {
				this.root.splice(start, end - start, ...parsed);
				this.paint();
				this.running = undefined;
				if (this.viewportChanged as boolean) {
					this.running = this.finePrint();
				}
			} else {
				this.running = undefined;
				this.running = this.coarsePrint();
			}
			return this.running;
		}
	}

	/**
	 * 高亮textarea
	 * @param textbox textarea元素
	 * @param include 是否嵌入
	 * @throws `TypeError` 不是textarea
	 */
	const edit = (textbox: HTMLTextAreaElement, include?: boolean): Printer => {
		if (!(textbox instanceof HTMLTextAreaElement)) {
			throw new TypeError('wikiparse.edit方法仅可用于textarea元素！');
		}
		const preview = document.createElement('div'),
			container = document.createElement('div'),
			printer = new Printer(preview, textbox, include);
		preview.id = 'wikiPretty';
		preview.classList.add('wikiparser', 'active');
		container.classList.add('wikiparse-container');
		textbox.replaceWith(container);
		textbox.classList.add('wikiparsed');
		container.append(preview, textbox);

		textbox.addEventListener('input', e => {
			if (!(e as InputEvent).isComposing) {
				printer.queue(2000, 'coarsePrint');
			}
			textbox.style.color = '';
			preview.classList.add('active');
		});
		textbox.addEventListener('scroll', () => {
			if (preview.scrollHeight > preview.offsetHeight && !preview.classList.contains('active')) {
				preview.scrollTop = textbox.scrollTop;
				printer.queue(500, 'finePrint');
			}
		});
		textbox.addEventListener('keydown', e => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				printer.ticks[0] = 0;
				printer.running = printer.coarsePrint();
			}
		});
		printer.running = printer.coarsePrint();
		return printer;
	};

	wikiparse.Printer = Printer;
	wikiparse.edit = edit;
})();
