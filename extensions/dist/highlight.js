var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(() => {
    const { wikiparse } = window;
    const highlight = (ele, linenums, start = 1) => __awaiter(void 0, void 0, void 0, function* () {
        if (ele.classList.contains('highlighted')) {
            return;
        }
        const html = (yield wikiparse.print(ele.innerText)).map(([, , printed]) => printed).join('');
        ele.classList.add('highlighted');
        if (linenums) {
            const lines = html.split('\n').map((line, i) => {
                const li = document.createElement('li');
                li.id = `L${i + start}`;
                li.innerHTML = line;
                return li;
            });
            if (!lines[lines.length - 1].textContent) {
                lines.pop();
            }
            const ol = document.createElement('ol');
            ol.start = start;
            ol.style.paddingLeft = `${String(lines.length + start - 1).length + 2.5}ch`;
            ol.append(...lines);
            ele.replaceChildren(ol);
        }
        else {
            ele.innerHTML = html;
        }
    });
    wikiparse.highlight = highlight;
})();
