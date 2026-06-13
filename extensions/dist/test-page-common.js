const isGH = location.hostname.endsWith('.github.io');
export const hideOptGroup = optgroup => {
    if (optgroup && !optgroup.childElementCount) {
        optgroup.remove();
    }
};
export const prepareDoneBtn = (btn, select, tests, dones, key) => {
    btn.disabled = !select.value;
    if (!isGH) {
        btn.style.display = '';
        btn.addEventListener('click', () => {
            var _a;
            dones.add(tests[Number(select.value)].desc);
            localStorage.setItem(key, JSON.stringify([...dones]));
            while ((_a = select.selectedOptions[0]) === null || _a === void 0 ? void 0 : _a.disabled) {
                select.selectedIndex++;
            }
            select.dispatchEvent(new Event('change'));
        });
    }
};
export const addOption = (optgroup, select, tests, dones, i, appendOption = true) => {
    const { desc, wikitext } = tests[i];
    if (wikitext === undefined) {
        hideOptGroup(optgroup);
        const ele = document.createElement('optgroup');
        ele.label = desc;
        select.append(ele);
        return ele;
    }
    else if (appendOption && (isGH || !dones.has(desc))) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = desc;
        optgroup.append(option);
    }
    return optgroup;
};
export const changeHandler = (pre, btn, select, tests) => {
    const { desc, wikitext } = tests[Number(select.value)];
    pre.textContent = wikitext;
    pre.classList.remove('wikiparser');
    wikiparse.highlight(pre, false, true);
    const [cur] = select.selectedOptions;
    if (cur) {
        cur.disabled = true;
    }
    btn.disabled = false;
    history.replaceState(null, '', `#${encodeURIComponent(desc)}`);
};
export const hashChangeHandler = (select, tests) => {
    addEventListener('hashchange', () => {
        const hash = decodeURIComponent(location.hash.slice(1)), i = tests.findIndex(({ desc }) => desc === hash);
        if (i !== -1) {
            select.value = String(i);
            select.dispatchEvent(new Event('change'));
        }
    });
    dispatchEvent(new HashChangeEvent('hashchange'));
};
export const inputHandler = (input, select) => {
    const optgroups = Array.from(select.querySelectorAll('optgroup')), options = optgroups.map(group => group.querySelectorAll('option'));
    input.addEventListener('change', () => {
        const { value } = input, lower = value.toLowerCase();
        let re;
        try {
            re = new RegExp(value, 'iu');
        }
        catch {
            try {
                re = new RegExp(value, 'i');
            }
            catch { }
        }
        const selected = select.value;
        select.innerHTML = '';
        for (let i = 0; i < optgroups.length; i++) {
            const group = optgroups[i];
            group.innerHTML = '';
            for (const option of options[i]) {
                const { textContent } = option;
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
