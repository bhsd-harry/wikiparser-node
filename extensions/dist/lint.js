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
var _Linter_instances, _Linter_id, _Linter_wikitext, _Linter_running, _Linter_lint;
const { wikiparse } = window;
class Linter {
    constructor(include) {
        _Linter_instances.add(this);
        _Linter_id.set(this, void 0);
        _Linter_wikitext.set(this, void 0);
        _Linter_running.set(this, void 0);
        __classPrivateFieldSet(this, _Linter_id, wikiparse.id++, "f");
        __classPrivateFieldSet(this, _Linter_wikitext, undefined, "f");
        __classPrivateFieldSet(this, _Linter_running, undefined, "f");
        this.include = Boolean(include);
    }
    queue(wikitext) {
        __classPrivateFieldSet(this, _Linter_wikitext, wikitext, "f");
        __classPrivateFieldSet(this, _Linter_running, __classPrivateFieldGet(this, _Linter_instances, "m", _Linter_lint).call(this, wikitext), "f");
        return __classPrivateFieldGet(this, _Linter_running, "f");
    }
    async codemirror(wikitext) {
        return (await this.queue(wikitext)).map(({ startIndex, endIndex, severity, message }) => ({
            from: startIndex,
            to: endIndex,
            severity,
            message,
        }));
    }
}
_Linter_id = new WeakMap(), _Linter_wikitext = new WeakMap(), _Linter_running = new WeakMap(), _Linter_instances = new WeakSet(), _Linter_lint = async function _Linter_lint(wikitext) {
    const { include } = this, errors = await wikiparse.lint(wikitext, include, __classPrivateFieldGet(this, _Linter_id, "f"));
    return this.include === include && __classPrivateFieldGet(this, _Linter_wikitext, "f") === wikitext ? errors : __classPrivateFieldGet(this, _Linter_running, "f");
};
wikiparse.Linter = Linter;
})();
