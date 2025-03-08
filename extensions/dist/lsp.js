(() => {
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _LanguageService_id, _LanguageService_include;
let data;
class LanguageService {
    get include() {
        return __classPrivateFieldGet(this, _LanguageService_include, "f");
    }
    constructor(include = true) {
        _LanguageService_id.set(this, void 0);
        _LanguageService_include.set(this, void 0);
        __classPrivateFieldSet(this, _LanguageService_id, wikiparse.id++, "f");
        __classPrivateFieldSet(this, _LanguageService_include, include, "f");
        data !== null && data !== void 0 ? data : (data = (async () => (await fetch(`${wikiparse.CDN}/data/signatures.json`)).json())());
        (async () => {
            wikiparse.provide('data', __classPrivateFieldGet(this, _LanguageService_id, "f"), await data, __classPrivateFieldGet(this, _LanguageService_include, "f"));
        })();
    }
    destroy() {
        wikiparse.provide('destroy', __classPrivateFieldGet(this, _LanguageService_id, "f"));
    }
    provideColorPresentations(color) {
        return wikiparse.provide('colorPresentations', __classPrivateFieldGet(this, _LanguageService_id, "f"), color, __classPrivateFieldGet(this, _LanguageService_include, "f"));
    }
    provideDocumentColors(text) {
        return wikiparse.provide('documentColors', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.1, text, __classPrivateFieldGet(this, _LanguageService_include, "f"));
    }
    provideFoldingRanges(text) {
        return wikiparse.provide('foldingRanges', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.2, text, __classPrivateFieldGet(this, _LanguageService_include, "f"));
    }
    provideLinks(text) {
        return wikiparse.provide('links', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.3, text, __classPrivateFieldGet(this, _LanguageService_include, "f"));
    }
    provideCompletionItems(text, position) {
        return wikiparse.provide('completionItems', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.4, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    provideReferences(text, position) {
        return wikiparse.provide('references', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.5, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    provideDefinition(text, position) {
        return wikiparse.provide('definition', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.6, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    resolveRenameLocation(text, position) {
        return wikiparse.provide('renameLocation', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.7, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    provideRenameEdits(text, position, newName) {
        return wikiparse.provide('renameEdits', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.8, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position, newName);
    }
    provideDiagnostics(wikitext, warning) {
        return wikiparse.provide('diagnostics', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.9, wikitext, __classPrivateFieldGet(this, _LanguageService_include, "f"), warning);
    }
    provideHover(text, position) {
        return wikiparse.provide('hover', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.05, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    provideSignatureHelp(text, position) {
        return wikiparse.provide('signatureHelp', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.15, text, __classPrivateFieldGet(this, _LanguageService_include, "f"), position);
    }
    provideInlayHints(text) {
        return wikiparse.provide('inlayHints', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.25, text, __classPrivateFieldGet(this, _LanguageService_include, "f"));
    }
    findStyleTokens() {
        return wikiparse.provide('findStyleTokens', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.35);
    }
}
_LanguageService_id = new WeakMap(), _LanguageService_include = new WeakMap();
wikiparse.LanguageService = LanguageService;
})();
