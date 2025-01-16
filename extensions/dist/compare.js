(() => {
"use strict";
(() => {
    const iframes = top.document.getElementsByTagName('iframe');
    iframes[0].addEventListener('load', () => {
        const { contentWindow, contentDocument } = iframes[0];
        contentWindow.addEventListener('hashchange', () => {
            for (let i = 1; i < iframes.length; i++) {
                iframes[i].contentWindow.location.hash = contentWindow.location.hash;
            }
        });
        contentDocument.querySelector('button').addEventListener('click', () => {
            for (let i = 1; i < iframes.length; i++) {
                if (iframes[i].contentWindow.location.hash === contentWindow.location.hash) {
                    iframes[i].contentDocument.querySelector('button').click();
                }
            }
        });
    });
    for (const iframe of iframes) {
        iframe.addEventListener('load', () => {
            const { contentDocument } = iframe, style = contentDocument.createElement('style');
            style.textContent = 'body{background:#fff}'
                + 'main{margin:0;box-shadow:none}'
                + '#compare>:last-child{display:none}';
            contentDocument.head.append(style);
        });
    }
})();
})();
