(() => {
const execute = (obj) => {
    Object.entries(obj.files).find(([k]) => k.endsWith('.data.js'))[1]();
};
Object.assign(globalThis, {
    mw: {
        loader: {
            done: false,
            impl(callback) {
                execute(callback()[1]);
            },
            implement(name, callback) {
                if (typeof callback === 'object') {
                    execute(callback);
                }
                else if (!this.done) {
                    callback();
                }
                if (name.startsWith('ext.CodeMirror.data')) {
                    this.done = true;
                }
            },
            state() {
            },
        },
        config: {
            values: {},
            set({ extCodeMirrorConfig }) {
                this.values.extCodeMirrorConfig = extCodeMirrorConfig;
            },
        },
    },
});
})();
