const isGH = location.hostname.endsWith('.github.io');

/**
 * 隐藏全部子项被禁用的选项组
 * @param optgroup 选项组
 */
const hideOptGroup: HideOptGroup = optgroup => {
	// eslint-disable-next-line unicorn/prefer-spread
	optgroup.style.display = Array.from(optgroup.querySelectorAll('option'))
		.every(({style}) => style.display === 'none')
		? 'none'
		: '';
};

/**
 * 为“Done”按钮添加事件处理程序
 * @param btn “Done”按钮
 * @param select 测试用例选择框
 * @param tests 测试用例数组
 * @param dones 已完成测试的描述集合
 * @param key 本地存储键名
 */
export const prepareDoneBtn: PrepareDoneBtn = (btn, select, tests, dones, key) => {
	btn.disabled = !select.value;
	if (!isGH) {
		btn.style.display = '';
		btn.addEventListener('click', () => {
			dones.add(tests[Number(select.value)]!.desc);
			localStorage.setItem(key, JSON.stringify([...dones]));
			while (select.selectedOptions[0]!.disabled) {
				select.selectedIndex++;
			}
			select.dispatchEvent(new Event('change'));
		});
	}
};

/**
 * 添加选项
 * @param optgroup 选项组
 * @param select 选择框
 * @param tests 测试用例数组
 * @param dones 已完成测试的描述集合
 * @param i 序号
 * @param appendOptgroup 是否添加选项组
 * @param appendOption 是否添加选项
 */
export const addOption: AddOption = (
	optgroup,
	select,
	tests,
	dones,
	i,
	appendOptgroup = true,
	appendOption = true,
) => {
	const {desc, wikitext} = tests[i]!;
	if (wikitext === undefined) {
		if (optgroup) {
			hideOptGroup(optgroup);
		}
		const ele = document.createElement('optgroup');
		ele.label = desc;
		if (appendOptgroup) {
			select.append(ele);
		}
		return ele;
	} else if (appendOption) {
		const option = document.createElement('option');
		option.value = String(i);
		option.textContent = desc;
		optgroup!.append(option);
		if (!isGH && dones.has(desc)) {
			option.disabled = true;
			option.style.display = 'none';
		}
	}
	return optgroup;
};

/**
 * 选项更改处理程序
 * @param pre 预格式化元素
 * @param btn “Done”按钮
 * @param select 选择框
 * @param tests 测试用例数组
 */
export const changeHandler: ChangeHandler = (pre, btn, select, tests) => {
	const {desc, wikitext} = tests[Number(select.value)]!;
	pre.textContent = wikitext!;
	pre.classList.remove('wikiparser');
	wikiparse.highlight!(pre, false, true);
	select.selectedOptions[0]!.disabled = true;
	btn.disabled = false;
	history.replaceState(null, '', `#${encodeURIComponent(desc)}`);
};

/**
 * 网址片段更改处理程序
 * @param select 选择框
 * @param tests 测试用例数组
 */
export const hashChangeHandler: HashChangeHandler = (select, tests) => {
	addEventListener('hashchange', () => {
		const hash = decodeURIComponent(location.hash.slice(1)),
			i = tests.findIndex(({desc}) => desc === hash);
		if (i !== -1) {
			select.value = String(i);
			select.dispatchEvent(new Event('change'));
		}
	});
	dispatchEvent(new HashChangeEvent('hashchange'));
};

/**
 * 搜索框输入处理程序
 * @param input 搜索框
 * @param select 选择框
 * @param dones 已完成测试的描述集合
 */
export const inputHandler: InputHandler = (input, select, dones) => {
	/* eslint-disable unicorn/prefer-spread */
	const options = Array.from(select.options),
		optgroups = Array.from(select.querySelectorAll('optgroup'));
	/* eslint-enable unicorn/prefer-spread */
	input.addEventListener('input', () => {
		const {value} = input,
			lower = value.toLowerCase();
		let re: RegExp | undefined;
		try {
			re = new RegExp(value, 'iu');
		} catch {
			try {
				re = new RegExp(value, 'i'); // eslint-disable-line require-unicode-regexp
			} catch {}
		}
		for (const option of options) {
			const {textContent, value: v} = option;
			option.style.display = !isGH && dones.has(textContent)
				|| v && !textContent.toLowerCase().includes(lower) && !(re && re.test(textContent))
				? 'none'
				: '';
		}
		for (const group of optgroups) {
			hideOptGroup(group);
		}
	});
};
