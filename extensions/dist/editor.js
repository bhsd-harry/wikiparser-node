(() => {
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Printer_instances, _Printer_id, _Printer_preview, _Printer_textbox, _Printer_root, _Printer_viewportChanged, _Printer_tick, _Printer_paint;
const { wikiparse } = window, { MAX_STAGE } = wikiparse;
class Printer {
    constructor(preview, textbox, include) {
        _Printer_instances.add(this);
        _Printer_id.set(this, void 0);
        _Printer_preview.set(this, void 0);
        _Printer_textbox.set(this, void 0);
        _Printer_root.set(this, void 0);
        _Printer_viewportChanged.set(this, void 0);
        __classPrivateFieldSet(this, _Printer_id, wikiparse.id++, "f");
        __classPrivateFieldSet(this, _Printer_preview, preview, "f");
        __classPrivateFieldSet(this, _Printer_textbox, textbox, "f");
        __classPrivateFieldSet(this, _Printer_root, [], "f");
        __classPrivateFieldSet(this, _Printer_viewportChanged, false, "f");
        this.include = Boolean(include);
        this.running = undefined;
        this.ticks = [0, undefined];
    }
    queue(delay, method) {
        const { ticks } = this, [state] = ticks;
        if (state <= 0 || method === 'coarsePrint' || ticks[1] !== 'coarsePrint') {
            ticks[0] = delay;
            ticks[1] = method;
            if (state <= 0) {
                __classPrivateFieldGet(this, _Printer_instances, "m", _Printer_tick).call(this);
            }
        }
    }
    async coarsePrint() {
        if (this.running) {
            return undefined;
        }
        const { include } = this, { value } = __classPrivateFieldGet(this, _Printer_textbox, "f"), parsed = await wikiparse.print(value, include, 2, __classPrivateFieldGet(this, _Printer_id, "f"));
        if (this.include !== include || __classPrivateFieldGet(this, _Printer_textbox, "f").value !== value) {
            this.running = undefined;
            this.running = this.coarsePrint();
            return this.running;
        }
        __classPrivateFieldSet(this, _Printer_root, parsed, "f");
        __classPrivateFieldGet(this, _Printer_instances, "m", _Printer_paint).call(this);
        this.running = undefined;
        this.running = this.finePrint();
        return this.running;
    }
    async finePrint() {
        if (this.running) {
            __classPrivateFieldSet(this, _Printer_viewportChanged, true, "f");
            return undefined;
        }
        __classPrivateFieldSet(this, _Printer_viewportChanged, false, "f");
        const { include } = this, { value } = __classPrivateFieldGet(this, _Printer_textbox, "f"), { scrollHeight, offsetHeight: parentHeight, scrollTop, children: [rootNode] } = __classPrivateFieldGet(this, _Printer_preview, "f");
        let text = value, start = 0, { length: end } = __classPrivateFieldGet(this, _Printer_root, "f");
        if (scrollHeight > parentHeight) {
            const childNodes = [...rootNode.childNodes], headings = childNodes.filter(({ className }) => className === 'wpb-heading'), { length } = headings;
            if (length > 0) {
                let i = headings.findIndex(({ offsetTop, offsetHeight }) => offsetTop + offsetHeight > scrollTop);
                i = i === -1 ? length : i;
                let j = headings.slice(i).findIndex(({ offsetTop }) => offsetTop >= scrollTop + parentHeight);
                j = j === -1 ? length : i + j;
                start = i ? childNodes.indexOf(headings[i - 1]) : 0;
                while (i <= j && __classPrivateFieldGet(this, _Printer_root, "f")[start][0] === MAX_STAGE) {
                    start = childNodes.indexOf(headings[i++]);
                }
                end = j === length ? end : childNodes.indexOf(headings[j]);
                while (i <= j && __classPrivateFieldGet(this, _Printer_root, "f")[end - 1][0] === MAX_STAGE) {
                    end = childNodes.indexOf(headings[--j]);
                }
                text = __classPrivateFieldGet(this, _Printer_root, "f").slice(start, end).map(([, str]) => str).join('');
            }
        }
        if (start === end) {
            this.running = undefined;
            return undefined;
        }
        const parsed = await wikiparse.print(text, include, MAX_STAGE, __classPrivateFieldGet(this, _Printer_id, "f"));
        if (this.include === include && __classPrivateFieldGet(this, _Printer_textbox, "f").value === value) {
            __classPrivateFieldGet(this, _Printer_root, "f").splice(start, end - start, ...parsed);
            __classPrivateFieldGet(this, _Printer_instances, "m", _Printer_paint).call(this);
            this.running = undefined;
            if (__classPrivateFieldGet(this, _Printer_viewportChanged, "f")) {
                this.running = this.finePrint();
            }
        }
        else {
            this.running = undefined;
            this.running = this.coarsePrint();
        }
        return this.running;
    }
}
_Printer_id = new WeakMap(), _Printer_preview = new WeakMap(), _Printer_textbox = new WeakMap(), _Printer_root = new WeakMap(), _Printer_viewportChanged = new WeakMap(), _Printer_instances = new WeakSet(), _Printer_tick = function _Printer_tick() {
    setTimeout(() => {
        const { ticks } = this, [t, method] = ticks;
        if (t > 0) {
            ticks[0] -= 500;
            if (t <= 500) {
                this[method]();
            }
            else {
                __classPrivateFieldGet(this, _Printer_instances, "m", _Printer_tick).call(this);
            }
        }
    }, 500);
}, _Printer_paint = function _Printer_paint() {
    __classPrivateFieldGet(this, _Printer_preview, "f").innerHTML = `<span class="wpb-root">${__classPrivateFieldGet(this, _Printer_root, "f").map(([, , printed]) => printed).join('')}</span> `;
    __classPrivateFieldGet(this, _Printer_preview, "f").scrollTop = __classPrivateFieldGet(this, _Printer_textbox, "f").scrollTop;
    __classPrivateFieldGet(this, _Printer_preview, "f").classList.remove('active');
    __classPrivateFieldGet(this, _Printer_textbox, "f").style.color = 'transparent';
};
const edit = (textbox, include) => {
    if (!(textbox instanceof HTMLTextAreaElement)) {
        throw new TypeError('wikiparse.edit方法仅可用于textarea元素！');
    }
    const preview = document.createElement('div'), container = document.createElement('div'), printer = new Printer(preview, textbox, include);
    preview.id = 'wikiPretty';
    preview.classList.add('wikiparser', 'active');
    container.classList.add('wikiparse-container');
    textbox.replaceWith(container);
    textbox.classList.add('wikiparsed');
    container.append(preview, textbox);
    textbox.addEventListener('input', e => {
        if (!e.isComposing) {
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
