(() => {
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
class Linter {
    constructor(include) {
        _Linter_instances.add(this);
        _Linter_id.set(this, void 0);
        _Linter_wikitext.set(this, void 0);
        _Linter_running.set(this, void 0);
        __classPrivateFieldSet(this, _Linter_id, wikiparse.id++, "f");
        this.include = Boolean(include);
    }
    queue(wikitext) {
        var _a;
        __classPrivateFieldSet(this, _Linter_wikitext, wikitext, "f");
        __classPrivateFieldSet(this, _Linter_running, (_a = __classPrivateFieldGet(this, _Linter_running, "f")) !== null && _a !== void 0 ? _a : __classPrivateFieldGet(this, _Linter_instances, "m", _Linter_lint).call(this, wikitext), "f");
        return __classPrivateFieldGet(this, _Linter_running, "f");
    }
    codemirror(wikitext) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.queue(wikitext))
                .map(({ startIndex, endIndex, severity, message, rule, fix, suggestions = [] }) => ({
                source: 'WikiLint',
                from: startIndex,
                to: endIndex,
                severity,
                rule,
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
        });
    }
    monaco(wikitext) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.queue(wikitext)).map(({ startLine, startCol, endLine, endCol, severity, message, rule }) => ({
                source: `WikiLint(${rule})`,
                startLineNumber: startLine + 1,
                startColumn: startCol + 1,
                endLineNumber: endLine + 1,
                endColumn: endCol + 1,
                severity: severity === 'error' ? 8 : 4,
                rule,
                message,
            }));
        });
    }
}
_Linter_id = new WeakMap(), _Linter_wikitext = new WeakMap(), _Linter_running = new WeakMap(), _Linter_instances = new WeakSet(), _Linter_lint = function _Linter_lint(wikitext) {
    return __awaiter(this, void 0, void 0, function* () {
        const { include } = this, errors = yield wikiparse.lint(wikitext, include, __classPrivateFieldGet(this, _Linter_id, "f"));
        if (this.include === include && __classPrivateFieldGet(this, _Linter_wikitext, "f") === wikitext) {
            __classPrivateFieldSet(this, _Linter_running, undefined, "f");
            return errors;
        }
        __classPrivateFieldSet(this, _Linter_running, __classPrivateFieldGet(this, _Linter_instances, "m", _Linter_lint).call(this, __classPrivateFieldGet(this, _Linter_wikitext, "f")), "f");
        return __classPrivateFieldGet(this, _Linter_running, "f");
    });
};
wikiparse.Linter = Linter;
})();
