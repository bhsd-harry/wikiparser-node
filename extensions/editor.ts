import type {PrinterBase} from './typings';

const enum PrintType {
	Coarse,
	Fine,
}

/** 用于打印AST */
class Printer implements PrinterBase {
	readonly #id;
	readonly #preview;
	readonly #textbox;
	#root: [number, string, string][];
	#viewportChanged;
	#running: Promise<void> | undefined;
	#ticks: [number, PrintType | undefined];
	include;

	/**
	 * @param preview 置于下层的代码高亮
	 * @param textbox 置于上层的文本框
	 * @param include 是否嵌入
	 */
	constructor(preview: HTMLDivElement, textbox: HTMLTextAreaElement, include?: boolean) {
		this.#id = wikiparse.id++;
		this.#preview = preview;
		this.#textbox = textbox;
		this.#root = [];
		this.#viewportChanged = false;
		this.include = Boolean(include);
		this.#ticks = [0, undefined];
	}

	/**
	 * 倒计时
	 * @description
	 * - 每`0.5`秒检查一次，如果倒计时结束则执行预定的方法
	 * - 没有进行中的倒计时则无效果
	 */
	#tick(): void {
		setTimeout(() => {
			const [t, method] = this.#ticks;
			if (t > 0) {
				this.#ticks[0] -= 500;
				if (t <= 500) {
					this.#exec(method!);
				} else {
					this.#tick();
				}
			}
		}, 500);
	}

	/**
	 * 执行私有方法
	 * @param method 方法名
	 */
	#exec(method: PrintType): void {
		if (method === PrintType.Coarse) {
			this.#coarsePrint();
		} else {
			this.#finePrint();
		}
	}

	/**
	 * 用于debounce
	 * @param delay 延迟
	 * @param method 方法
	 * @description
	 * - 定时执行预定的方法
	 * - 当前有倒计时且新指令优先级较低则无效果
	 * - 延迟为`0`时立即执行
	 */
	queue(delay: number, method: PrintType): void {
		const [state] = this.#ticks;
		if (delay === 0 || state <= 0 || method === PrintType.Coarse || this.#ticks[1] !== PrintType.Coarse) {
			this.#ticks = [delay, method];
			if (delay === 0) {
				this.#exec(method);
			} else if (state <= 0) {
				this.#tick();
			}
		}
	}

	/** 渲染 */
	#paint(): void {
		this.#preview.innerHTML = `<span class="wpb-root">${
			this.#root.map(([,, printed]) => printed).join('')
		}</span> `;
		this.#preview.scrollTop = this.#textbox.scrollTop;
		this.#preview.classList.remove('active');
		this.#textbox.style.color = 'transparent';
	}

	/**
	 * 初步解析
	 * @description
	 * - 已有进行中的解析则无效果
	 * - 解析完成后
	 *   - 如果解析设置或文本框内容发生变化则重新解析
	 *   - 否则初步渲染并开始精细解析
	 * - 无论是否被执行，可以保证只渲染正确的结果
	 * - 仅在二次渲染（`finePrint`）后才返回
	 */
	async #coarsePrint(): Promise<void> {
		if (this.#running) {
			return this.#running;
		}
		const {include} = this,
			{value} = this.#textbox,
			parsed = await wikiparse.print(value, include, 2, this.#id);
		if (this.include !== include || this.#textbox.value !== value) {
			this.#running = undefined;
			this.#running = this.#coarsePrint();
			return this.#running;
		}
		this.#root = parsed;
		this.#paint();
		this.#running = undefined;
		this.#running = this.#finePrint();
		return this.#running;
	}

	/**
	 * 根据可见范围精细解析
	 * @description
	 * - 已有进行中的解析则仅标记视口已变化
	 * - 仅解析可见范围内的内容
	 * - 解析完成后
	 *   - 如果解析设置或文本框内容发生变化则重新粗略解析
	 *   - 否则二次渲染
	 *   - 如果视口发生变化则额外进行精细解析
	 * - 无论是否被执行，可以保证只渲染正确的结果
	 * - 仅在二次渲染后才返回
	 */
	async #finePrint(): Promise<void> {
		if (this.#running) {
			this.#viewportChanged = true;
			return this.#running;
		}
		this.#viewportChanged = false;
		const {include} = this,
			{value} = this.#textbox,
			{scrollHeight, offsetHeight: parentHeight, scrollTop, children} = this.#preview;
		let text = value,
			start = 0,
			end = this.#root.length;
		if (scrollHeight > parentHeight) {
			const childNodes = [...children[0]!.childNodes as unknown as Iterable<HTMLElement>],
				headings = childNodes.filter(({className}) => className === 'wpb-heading'),
				{length} = headings;
			if (length > 0) {
				let i = headings.findIndex(({offsetTop, offsetHeight}) => offsetTop + offsetHeight > scrollTop);
				i = i === -1 ? length : i;
				let j = headings.slice(i).findIndex(({offsetTop}) => offsetTop >= scrollTop + parentHeight);
				j = j === -1 ? length : i + j;
				start = i ? childNodes.indexOf(headings[i - 1]!) : 0;
				while (i <= j && this.#root[start]![0] === Infinity) {
					start = childNodes.indexOf(headings[i++]!);
				}
				end = j === length ? end : childNodes.indexOf(headings[j]!);
				while (i <= j && this.#root[end - 1]![0] === Infinity) {
					end = childNodes.indexOf(headings[--j]!);
				}
				text = this.#root.slice(start, end).map(([, str]) => str).join('');
			}
		}
		if (start === end) {
			this.#running = undefined;
			return undefined;
		}
		const parsed = await wikiparse.print(text, include, undefined, this.#id);
		if (this.include === include && this.#textbox.value === value) {
			this.#root.splice(start, end - start, ...parsed);
			this.#paint();
			this.#running = undefined;
			if (this.#viewportChanged as boolean) {
				this.#running = this.#finePrint();
			}
		} else {
			this.#running = undefined;
			this.#running = this.#coarsePrint();
		}
		return this.#running;
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
	container.className = 'wikiparse-container';
	textbox.replaceWith(container);
	textbox.classList.add('wikiparsed');
	container.append(preview, textbox);

	textbox.addEventListener('input', e => {
		if (!(e as InputEvent).isComposing) {
			printer.queue(2000, PrintType.Coarse);
		}
		textbox.style.color = '';
		preview.classList.add('active');
	});
	textbox.addEventListener('scroll', () => {
		if (preview.scrollHeight > preview.offsetHeight && !preview.classList.contains('active')) {
			preview.scrollTop = textbox.scrollTop;
			printer.queue(500, PrintType.Fine);
		}
	});
	printer.queue(0, PrintType.Coarse);
	return printer;
};

wikiparse.Printer = Printer;
wikiparse.edit = edit;
