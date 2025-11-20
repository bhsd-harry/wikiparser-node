(() => {
"use strict";
(() => {
    const iframes = document.getElementsByTagName('iframe');
    for (let i = 0; i < iframes.length; i++) {
        iframes[i].addEventListener('load', () => {
            const { contentDocument } = iframes[i], style = contentDocument.createElement('style');
            style.textContent = `body{background:#fff}main{margin:0;box-shadow:none}${i === 0 ? '' : '.field{min-height:0}select,'}#compare>:last-child{display:none}`;
            contentDocument.head.append(style);
        });
    }
    iframes[0].addEventListener('load', () => {
        const { contentWindow, contentDocument } = iframes[0];
        contentWindow.addEventListener('casechange', () => {
            for (let i = 1; i < iframes.length; i++) {
                iframes[i].contentWindow.location.hash = contentWindow.location.hash;
            }
            history.replaceState(null, '', contentWindow.location.hash);
        });
        contentDocument.querySelector('button').addEventListener('click', () => {
            for (let i = 1; i < iframes.length; i++) {
                if (iframes[i].contentWindow.location.hash === contentWindow.location.hash) {
                    iframes[i].contentDocument.querySelector('button').click();
                }
            }
        });
        addEventListener('hashchange', () => {
            contentWindow.location.hash = location.hash;
        });
        dispatchEvent(new HashChangeEvent('hashchange'));
    });
})();
})();
