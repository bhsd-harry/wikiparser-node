# Token
## 方法
### 静态方法
**parse**(wikitext: string, n: number, config: object): [Token](#token)
- 解析文本。
- 参数:
  - wikitext: 文本。
  - n: 解析层级，详见token.js开头的注释。Default: ```MAX_STAGE = 11```
  - config: 设置。Default: ```require(Token.config)```
```js
const wikitext = `a
<ref>b</ref>
<!-- c -->`,
  root = Token.parse(wikitext, 1); // 注释和扩展标签均只需要解析层级1即可。
assert(root.toString() === wikitext);
```

**normalizeTitle**(title: string, defaultNs: number, config: object): string
- 规范化页面标题。
- 参数:
  - title: 原始标题。
  - defaultNs: 默认名字空间。Default: ```0```
  - config: 设置。Default: ```require(Token.config)```
```js
assert(Token.normalizeTitle('doc', 10) === 'Template:Doc');
assert(Token.normalizeTitle(':mainpage', 10) === 'Mainpage');
```

### 原型方法
**isPlain**(): boolean
- 是否是普通节点（即与根节点同类）。
```js
const [, b,, c] = root,
  [, inner] = b;
assert(inner.isPlain() === true);
```

**length**(): number
- 子节点数。
```js
assert(root.length() === 4); // 注释和<nowiki>之间还有一个'\n'
```

**text**(): string
- 将解析后的维基文本转换为纯文字，是toString()方法的别名。
```js
assert(root.text() === wikitext);
```

**is**(selector: string): boolean
- 判断节点是否满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。
```js
assert(root.is('root:has(ext-attr)'));
assert(b.is('#ref:not(root, comment):contains("b"):nth-last-of-type(:2)'));
assert(c.is('[closed=true]:nth-child(4)')); // 注意选择器计数是从1开始的，类似CSS选择器
```

**not**(selector: string): boolean
- 判断节点是否不满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。
- 说明：纯文本节点总是返回```false```。
```js
assert(root.not('[type!=root]'));
```

**parent**([selector: string]): Token|null
- 父节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。
```js
assert.deepStrictEqual(b.parent(), root);
```

**closest**(selector: string): Token|null
- 最近的满足[选择器](#选择器)的祖先节点。
- 参数：
  - selector: 选择器。
```js
assert.deepStrictEqual(inner.closest('root'), root);
```

**parents**([selector: string]): [UniqueCollection](#uniquecollection)
- 祖先节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。
```js
assert.deepStrictEqual(inner.parents(), new Token.$.UniqueCollection([b, root]));
```

**parentsUntil**(selector: string): [UniqueCollection](#uniquecollection)
- 直到某个满足[选择器](#选择器)的节点（不包含）为止的祖先节点。
- 参数：
  - selector: 选择器。
```js
assert.deepStrictEqual(inner.parentsUntil('root'), new Token.$.UniqueCollection(b));
```

**even**(): [TokenCollection](#tokencollection)
- 偶数编号的子节点。
- 说明：包含纯文本节点。
```js
assert.deepStrictEqual(root.even(), new Token.$.TokenCollection(['a\n', '\n']));
```

**odd**(): [TokenCollection](#tokencollection)
- 奇数编号的子节点。
- 说明：包含纯文本节点。
```js
assert.deepStrictEqual(root.odd(), new Token.$.TokenCollection([b, c]));
```

**eq**(n: number|string): [TokenCollection](#tokencollection)
- 指定编号的子节点
- 参数：
  - n: 编号，可以是数字（负数表示从末尾计数），也可以是类似Python中切片语法的字符串。
  - 示例：```.eq('::2')```等效```.eq('even')```或是```.even()```。
  - 多个参数时取并集，如```.eq(0, 1)```会同时返回编号为0和1的两个子节点，```.eq('odd', '::2')```会返回所有子节点。
- 说明：包含纯文本节点。
```js
assert.deepStrictEqual(root.eq(0, '1::2'), new Token.$.TokenCollection(['a\n', b, c]));
```

**children**([selector: string]): [UniqueCollection](#uniquecollection)
- 子节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）：选择器。
- 说明：不包含纯文本节点。
```js
assert.deepStrictEqual(root.children(), new Token.$.UniqueCollection([b, c]));
```

**contains**(token: string|Token, includingSelf: boolean): boolean
- 判断是否包含另一节点。
- 参数：
  - token: 字符串或非纯文本节点。
  - includingSelf: 是否将同一节点视为互相包含。Default: ```false```
```js
assert(root.contains(b));
assert(root.contains('a\n<ref')); // 参数为字符串时会先执行.text()方法
```

**each**([selector: string], callback: function, [maxDepth: number]): this|Promise<this>
- 遍历子孙节点进行操作，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
  - callback: 回调函数。可以是异步函数，此时方法返回的是个Promise。
  - maxDepth（可选）: 遍历深度，自身对应的深度为0。Default: ```Infinity```
- 说明：不会遍历纯文本节点。遍历顺序为广度优先。
```js
let output = '';
root.each(({type}) => {
  output += `${type}\n`;
});
assert(output === 'root\next\ncomment\next-attr\next-inner\n');
```

**descendants**(selector: string, [maxDepth: number]): [UniqueCollection](#uniquecollection)
- 子孙节点，可以额外进行[选择器](#选择器)筛选或是限制深度。
- 参数；
  - selector: 选择器。Default: ```''```
  - maxDepth（可选）: 深度，自身（不包含）对应的深度为0。Default: ```Infinity```
- 说明：不包含纯文本节点。
```js
assert.deepStrictEqual(root.descendants(undefined, 1), new Token.$.UniqueCollection([b, c]));
```
  
**has**(selector: string): boolean
- 是否存在满足[选择器](#选择器)的子孙节点。
- 参数：
  - selector: 选择器。
```js
assert(root.has('ext-inner') === true);
```
  
**index**(ofType: boolean): number
- 在兄弟节点间的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```
```js
assert(b.index() === 1);
assert(b.index(true) === 0);
```
  
**lastIndex**(ofType: boolean): number
- 在兄弟节点间从末尾计数的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```
```js
assert(b.lastIndex() === 2);
assert(b.lastIndex(true) === 0);
```
  
**next**([selector: string]): Token|null
- 下一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
```js
assert(b.next() === '\n');
assert(b.next('') === null);
```
  
**prev**([selector: string]): Token|null
- 上一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
```js
assert(b.prev() === 'a\n');
```
  
**nextAll**([selector: string]): [TokenCollection](#tokencollection)
- 自身之后的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
```js
assert.deepStrictEqual(b.nextAll(''), new Token.$.TokenCollection(c));
```
  
**prevAll**([selector: string]): [TokenCollection](#tokencollection)
- 自身之前的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
```js
assert.deepStrictEqual(b.prevAll(), new Token.$.TokenCollection('a\n'));
```
  
**nextUntil**(selector: string): [TokenCollection](#tokencollection)
- 自身之后、直到某个满足[选择器](#选择器)的节点（不包含）之前的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点。
```js
assert.deepStrictEqual(b.nextUntil('comment'), new Token.$.TokenCollection('\n'));
```
  
**prevUntil**(selector: string): [TokenCollection](#tokencollection)
- 自身之前、直到某个满足[选择器](#选择器)的节点（不包含）之后的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点，且倒序排列。
```js
assert.deepStrictEqual(c.prevUntil('ext'), new Token.$.TokenCollection('\n'));
```
  
**siblings**([selector: string]): [TokenCollection](#tokencollection)
- 全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
```js
assert.deepStrictEqual(b.siblings(), new Token.$.TokenCollection(['a\n', '\n', c]));
assert.deepStrictEqual(b.siblings(''), new Token.$.TokenCollection(c));
```
  
**on**(name: string, callback: function): this
- 处理事件。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
```js
let onCount = 0;
const onTest = data => {
  onCount += data;
};
root.on('test', onTest);
```
  
**once**(name: string, callback: function): this
- 类似on方法，但事件处理器只会执行一次。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
```js
let onceCount = 0;
const onceTest = data => {
  onceCount += data;
};
root.once('test', onceTest);
```
  
**emit**(name: string, [...args: any[]]): this
- 触发事件。
- 参数：
  - name: 事件名。
  - args（可选）: 事件数据。
```js
root.emit('test', 1).emit('test', 2);
assert(onCount === 3);
assert(onceCount === 1);
```
  
**off**(name: string, callback: function): this
- 移除指定的事件处理器。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
```js
root.off('test', onTest);
```
  
**listeners**(name: string): function[]
- 列出指定名称下的全部事件处理器。
- 参数：
  - name: 事件名。
```js
assert.deepStrictEqual(root.listeners('test'), []);
```
  
**detach**(): this
- 从父节点上脱离。
- 说明：自身仍留有原父节点的索引。
```js
c.detach();
assert(root.contains(c) === false);
assert(c.parent() === root);
```
  
**remove**(): this
- 同时从父节点和所有子节点上脱离。
- 说明：自身仍留有原先父节点和子节点的索引。
```js
b.remove();
assert(inner.parent() === null);
assert(b.length() === 2);
```
  
**insert**(args: (string|Token)[], i: number): this
- 在指定位置处插入一些纯文本或非纯文本节点。
- 参数：
  - args: 节点数组。
  - i: 插入起始位置。Default: ```this.$children.length```
```js
root.insert([c], 2);
assert(c.index() === 2);
```

**append**(...args: (string|Token)[]): this
- 在末尾插入新的纯文本或非纯文本节点。
```js
root.append('d');
assert(root.length() === 4);
```

**prepend**(...args: (string|Token)[]): this
- 在开头插入新的纯文本或非纯文本节点。
```js
root.prepend(b);
assert(b.index() === 0);
```
  
**delete**(...args: (number|string|Token)[]): this
- 删除指定子节点。
- 参数：
  - args: 可以是子节点编号或Python切片，也可以是指定的[Token](#token)对象。
```js
root.delete(-1, c);
assert(root.length() === 3);
```
  
**content**(children: string|Token|(string|Token)[]): this
- 完全替换掉全部子节点。
- 参数：
  - children: 新的纯文本或非纯文本子节点。
```js
root.content(c);
assert(root.length() === 1);
```
  
**replaceWith**(token: string|Token): this
- 将自身在父节点中的位置替换为另一个节点。
- 参数：
  - token: 纯文本或非纯文本节点。
```js
c.replaceWith(b);
assert(root.contains(b) === true);
assert(root.contains(c) === false);
```
  
**sections**([force: boolean]): TokenCollection[]
- 获取各章节。
- 参数：
  - force（可选）: 是否重新生成。
```js
const page = Token.parse(`d
==e==
f
===g===
h
===i===
j
==k==
l`),
  [d, e, f, g, h, i, j, k, l] = page;
assert.deepStrictEqual(page.sections(), [
  new Token.$.TokenCollection(d),
  new Token.$.TokenCollection(e, f, g, h, i, j),
  new Token.$.TokenCollection(g, h),
  new Token.$.TokenCollection(i, j),
  new Token.$.TokenCollection(k, l),
]);
```
  
**section**(n: number): [TokenCollection](#tokencollection)
- 获取指定编号的章节。
- 参数：
  - n: 章节编号。
```js
assert.deepStrictEqual(page.section(0), new Token.$.TokenCollection(d));
```
  
**comment**(): this
- 将自身替换为相同内容的注释。
- 说明：虽然内容相同，但不是同一个节点，注释内部的是纯文本节点。
```js
b.comment();
assert(root.contains(b) === false);
assert(root.text() === '<!--<ref>b</ref>-->');
```
  
**nowiki**(): this
- 将自身替换为被```<nowiki>```标签包裹的相同内容。
- 说明：虽然内容相同，但不是同一个节点，```<nowiki>```标签内部的是纯文本节点。
```js
root.content(c);
c.nowiki();
assert(root.contains(c) === false);
assert(root.text() === '<nowiki><!-- c --></nowiki>');
```

## 属性
### 静态属性
**config**: string
- 维基文本的默认设置JSON路径。
- Default: ```'./config'```

### 实例属性
**$children**: [TokenCollection](#tokencollection)
- 子节点数组
```js
assert.deepStrictEqual(page.$children, new Token.$.TokenCollection(d, e, f, g, h, i, j, k, l));
```

**type**: string
- 节点类型
- Default: ```'root'```
```js
assert(root.type === 'root');
```

# TokenCollection

# UniqueCollection

# 选择器
