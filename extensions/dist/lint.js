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
var _Linter_instances, _Linter_id, _Linter_wikitext, _Linter_running, _Linter_done, _Linter_config, _Linter_lint;
class Linter {
    constructor(include) {
        _Linter_instances.add(this);
        _Linter_id.set(this, void 0);
        _Linter_wikitext.set(this, void 0);
        _Linter_running.set(this, void 0);
        _Linter_done.set(this, void 0);
        _Linter_config.set(this, void 0);
        __classPrivateFieldSet(this, _Linter_id, wikiparse.id++, "f");
        this.include = Boolean(include);
    }
    async queue(wikitext) {
        var _a;
        if (__classPrivateFieldGet(this, _Linter_wikitext, "f") === wikitext && __classPrivateFieldGet(this, _Linter_config, "f") === wikiparse.config && !__classPrivateFieldGet(this, _Linter_running, "f")) {
            return __classPrivateFieldGet(this, _Linter_done, "f");
        }
        __classPrivateFieldSet(this, _Linter_wikitext, wikitext, "f");
        __classPrivateFieldSet(this, _Linter_running, (_a = __classPrivateFieldGet(this, _Linter_running, "f")) !== null && _a !== void 0 ? _a : __classPrivateFieldGet(this, _Linter_instances, "m", _Linter_lint).call(this, wikitext), "f");
        return __classPrivateFieldGet(this, _Linter_running, "f");
    }
    async codemirror(wikitext) {
        return (await this.queue(wikitext))
            .map(({ startIndex, endIndex, severity, message, rule, fix, suggestions = [] }) => ({
            source: 'WikiLint',
            from: startIndex,
            to: endIndex,
            severity,
            message: `${message} (${rule})`,
            actions: [
                ...fix ? [{ name: `Fix: ${fix.desc}`, fix }] : [],
                ...suggestions.map(suggestion => ({ name: `Suggestion: ${suggestion.desc}`, fix: suggestion })),
            ].map(({ name, fix: { range: [from, to], text } }) => ({
                name,
                apply(view) {
                    view.dispatch({ changes: { from, to, insert: text } });
                },
            })),
        }));
    }
    async monaco(wikitext) {
        return (await this.queue(wikitext))
            .map(({ startLine, startCol, endLine, endCol, severity, message, rule }) => ({
            source: `WikiLint`,
            startLineNumber: startLine + 1,
            startColumn: startCol + 1,
            endLineNumber: endLine + 1,
            endColumn: endCol + 1,
            severity: severity === 'error' ? 8 : 4,
            code: rule,
            message,
        }));
    }
}
_Linter_id = new WeakMap(), _Linter_wikitext = new WeakMap(), _Linter_running = new WeakMap(), _Linter_done = new WeakMap(), _Linter_config = new WeakMap(), _Linter_instances = new WeakSet(), _Linter_lint = async function _Linter_lint(wikitext) {
    __classPrivateFieldSet(this, _Linter_config, wikiparse.config, "f");
    const { include } = this, errors = await wikiparse.lint(wikitext, include, __classPrivateFieldGet(this, _Linter_id, "f"));
    if (this.include === include && __classPrivateFieldGet(this, _Linter_wikitext, "f") === wikitext && __classPrivateFieldGet(this, _Linter_config, "f") === wikiparse.config) {
        __classPrivateFieldSet(this, _Linter_running, undefined, "f");
        __classPrivateFieldSet(this, _Linter_done, errors, "f");
        return errors;
    }
    __classPrivateFieldSet(this, _Linter_running, __classPrivateFieldGet(this, _Linter_instances, "m", _Linter_lint).call(this, __classPrivateFieldGet(this, _Linter_wikitext, "f")), "f");
    return __classPrivateFieldGet(this, _Linter_running, "f");
};
wikiparse.Linter = Linter;
})();
