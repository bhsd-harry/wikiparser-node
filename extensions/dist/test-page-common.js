const isGH = location.hostname.endsWith('.github.io');
const hideOptGroup = optgroup => {
    optgroup.style.display = Array.from(optgroup.querySelectorAll('option'))
        .every(({ style }) => style.display === 'none')
        ? 'none'
        : '';
};
export const prepareDoneBtn = (btn, select, tests, dones, key) => {
    btn.disabled = !select.value;
    if (!isGH) {
        btn.style.display = '';
        btn.addEventListener('click', () => {
            dones.add(tests[Number(select.value)].desc);
            localStorage.setItem(key, JSON.stringify([...dones]));
            while (select.selectedOptions[0].disabled) {
                select.selectedIndex++;
            }
            select.dispatchEvent(new Event('change'));
        });
    }
};
export const addOption = (optgroup, select, tests, dones, i, appendOptgroup = true, appendOption = true) => {
    const { desc, wikitext } = tests[i];
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
    }
    else if (appendOption) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = desc;
        optgroup.append(option);
        if (!isGH && dones.has(desc)) {
            option.disabled = true;
            option.style.display = 'none';
        }
    }
    return optgroup;
};
export const changeHandler = (pre, btn, select, tests) => {
    const { desc, wikitext } = tests[Number(select.value)];
    pre.textContent = wikitext;
    pre.classList.remove('wikiparser');
    wikiparse.highlight(pre, false, true);
    select.selectedOptions[0].disabled = true;
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
export const inputHandler = (input, select, dones) => {
    const options = Array.from(select.options), optgroups = Array.from(select.querySelectorAll('optgroup'));
    input.addEventListener('input', () => {
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
        for (const option of options) {
            const { textContent, value: v } = option;
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
