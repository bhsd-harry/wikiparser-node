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
var _LanguageService_id;
class LanguageService {
    constructor() {
        _LanguageService_id.set(this, void 0);
        __classPrivateFieldSet(this, _LanguageService_id, wikiparse.id++, "f");
    }
    provideDocumentColors(text) {
        return wikiparse.provide('documentColors', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.1, text);
    }
    provideColorPresentations(color) {
        return wikiparse.provide('colorPresentations', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.2, color);
    }
    provideCompletionItems(text, position) {
        return wikiparse.provide('completionItems', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.3, text, position);
    }
    provideFoldingRanges(text) {
        return wikiparse.provide('foldingRanges', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.4, text);
    }
    provideLinks(text) {
        return wikiparse.provide('links', __classPrivateFieldGet(this, _LanguageService_id, "f") + 0.5, text);
    }
}
_LanguageService_id = new WeakMap();
wikiparse.LanguageService = LanguageService;
})();
