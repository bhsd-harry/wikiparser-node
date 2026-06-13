const isGH = location.hostname.endsWith('.github.io');

/**
 * 隐藏全部子项被禁用的选项组
 * @param optgroup 选项组
 */
export const hideOptGroup: HideOptGroup = optgroup => {
	if (optgroup && !optgroup.childElementCount) {
		optgroup.remove();
	}
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
			while (select.selectedOptions[0]?.disabled) {
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
 * @param appendOption 是否添加选项
 */
export const addOption: AddOption = (
	optgroup,
	select,
	tests,
	dones,
	i,
	appendOption = true,
) => {
	const {desc, wikitext} = tests[i]!;
	if (wikitext === undefined) {
		hideOptGroup(optgroup);
		const ele = document.createElement('optgroup');
		ele.label = desc;
		select.append(ele);
		return ele;
	} else if (appendOption && (isGH || !dones.has(desc))) {
		const option = document.createElement('option');
		option.value = String(i);
		option.textContent = desc;
		optgroup!.append(option);
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
	const [cur] = select.selectedOptions;
	if (cur) {
		cur.disabled = true;
	}
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
 */
export const inputHandler: InputHandler = (input, select) => {
	/* eslint-disable unicorn/prefer-spread */
	const optgroups = Array.from(select.querySelectorAll('optgroup')),
		options = optgroups.map(group => group.querySelectorAll('option'));
	/* eslint-enable unicorn/prefer-spread */
	input.addEventListener('change', () => {
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
		const selected = select.value;
		select.innerHTML = '';
		for (let i = 0; i < optgroups.length; i++) {
			const group = optgroups[i]!;
			group.innerHTML = '';
			for (const option of options[i]!) {
				const {textContent} = option;
				if (textContent.toLowerCase().includes(lower) || re && re.test(textContent)) {
					group.append(option);
				}
			}
			if (group.childElementCount) {
				select.append(group);
			}
		}
		select.value = selected;
	});
};
