(() => {
const getCondition = (selector) => {
    const types = new Set(selector.split(',').map(s => s.trim()).filter(Boolean));
    return (node) => types.has(node.type);
};
class ExtendedASTClass {
    get nextSibling() {
        var _a;
        const siblings = (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.childNodes;
        return siblings === null || siblings === void 0 ? void 0 : siblings[siblings.indexOf(this) + 1];
    }
    get previousSibling() {
        var _a;
        const siblings = (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.childNodes;
        return siblings === null || siblings === void 0 ? void 0 : siblings[siblings.indexOf(this) - 1];
    }
    get firstChild() {
        return this.childNodes[0];
    }
    get lastChild() {
        return this.childNodes.at(-1);
    }
    get length() {
        return typeof this.data === 'string' ? this.data.length : this.childNodes.length;
    }
    constructor(ast, parent) {
        var _a, _b;
        Object.assign(this, ast);
        this.parentNode = parent;
        this.childNodes = (_b = (_a = ast.childNodes) === null || _a === void 0 ? void 0 : _a.map(child => new ExtendedASTClass(child, this))) !== null && _b !== void 0 ? _b : [];
    }
    getRootNode() {
        let self = this;
        while (self.parentNode) {
            self = self.parentNode;
        }
        return self;
    }
    is(type) {
        return this.type === type;
    }
    closest(selector) {
        const condition = getCondition(selector);
        let { parentNode } = this;
        while (parentNode) {
            if (condition(parentNode)) {
                return parentNode;
            }
            ({ parentNode } = parentNode);
        }
        return undefined;
    }
    querySelector(selector) {
        const condition = getCondition(selector), stack = [...this.childNodes].reverse();
        while (stack.length > 0) {
            const child = stack.pop();
            if (condition(child)) {
                return child;
            }
            const { childNodes } = child;
            for (let i = childNodes.length - 1; i >= 0; i--) {
                stack.push(childNodes[i]);
            }
        }
        return undefined;
    }
    querySelectorAll(selector) {
        const condition = getCondition(selector), stack = [...this.childNodes].reverse(), descendants = [];
        while (stack.length > 0) {
            const child = stack.pop();
            if (condition(child)) {
                descendants.push(child);
            }
            const { childNodes } = child;
            for (let i = childNodes.length - 1; i >= 0; i--) {
                stack.push(childNodes[i]);
            }
        }
        return descendants;
    }
}
const parse = async (wikitext, include, qid, stage) => new ExtendedASTClass(await wikiparse.json(wikitext, include, qid, stage));
wikiparse.parse = parse;
})();
