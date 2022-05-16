# Token
这是所有解析后的维基文本的基础类，同时也是一个可迭代对象，迭代器会依次返回[$children](#token.$children)属性的各个元素。

## 方法<a id="token.methods"></a>
### 静态方法<a id="token.static.methods"></a>
**parse**(wikitext: string): Token<a id="token.parse"></a>
- 解析文本。
- 参数:
  - wikitext: 文本。
- 说明：所有不同的Token类型都推荐使用这个方法生成，以免出现错误语法。

```js
const wikitext = `a
<ref>b</ref>
<!-- c -->`;
const root = Token.parse(wikitext);
assert(String(root) === wikitext); // Token可以无损还原为维基文本
```

**normalizeTitle**(title: string, defaultNs: number): string<a id="token.normalizetitle"></a>
- 规范化页面标题。
- 参数:
  - title: 未规范化的标题。
  - defaultNs: 默认名字空间。Default: ```0```（即主空间）

```js
assert(Token.normalizeTitle('doc', 10) === 'Template:Doc');
assert(Token.normalizeTitle(':mainpage', 10) === 'Mainpage');
```

### 原型方法<a id="token.prototype.methods"></a>
**isPlain**(): boolean<a id="token.isplain"></a>
- 是否是普通节点（即基础的Token类）。根节点就是一个普通节点。

```js
const [, b,, c] = root,
  [, inner] = b;
assert(inner.isPlain() === true);
```

**length**(): number<a id="token.length"></a>
- 子节点数。即```.$children.length```。

```js
assert(root.length() === 4); // 注释和<nowiki>之间还有一个'\n'
```

**text**(): string<a id="token.text"></a>
- 将解析后的维基文本转换为纯文字。

```js
assert(root.text() === wikitext);
```

**is**(selector: string): boolean<a id="token.is"></a>
- 判断节点是否满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。

```js
assert(root.is('root:has(ext-attr)'));
assert(b.is('#ref:not(root, comment):contains("b"):nth-last-of-type(:2)'));
assert(c.is('[closed=true]:nth-child(4)')); // 注意选择器计数是从1开始的，类似CSS选择器
```

**not**(selector: string): boolean<a id="token.not"></a>
- 判断节点是否不满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。
- 说明：纯文本节点总是返回```false```。

```js
assert(root.not('[type!=root]'));
```

**parent**([selector: string]): Token\|null<a id="token.parent"></a>
- 父节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。

```js
assert.deepStrictEqual(b.parent(), root);
```

**closest**(selector: string): Token\|null<a id="token.closest"></a>
- 最近的满足[选择器](#选择器)的祖先节点。
- 参数：
  - selector: 选择器。

```js
assert.deepStrictEqual(inner.closest('root'), root);
```

**parents**([selector: string]): [UniqueCollection](#uniquecollection)<a id="token.parents"></a>
- 祖先节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。

```js
assert.deepStrictEqual(inner.parents(), new Token.$.UniqueCollection([b, root]));
```

**parentsUntil**(selector: string): [UniqueCollection](#uniquecollection)<a id="token.parentsuntil"></a>
- 直到某个满足[选择器](#选择器)的节点（不包含）为止的祖先节点。
- 参数：
  - selector: 选择器。

```js
assert.deepStrictEqual(inner.parentsUntil('root'), new Token.$.UniqueCollection(b));
```

**even**(): [TokenCollection](#tokencollection)<a id="token.even"></a>
- 偶数编号的子节点。
- 说明：包含纯文本节点。

```js
assert.deepStrictEqual(root.even(), new Token.$.TokenCollection(['a\n', '\n']));
```

**odd**(): [TokenCollection](#tokencollection)<a id="token.odd"></a>
- 奇数编号的子节点。
- 说明：包含纯文本节点。

```js
assert.deepStrictEqual(root.odd(), new Token.$.TokenCollection([b, c]));
```

**eq**(n: number\|string): [TokenCollection](#tokencollection)<a id="token.eq"></a>
- 指定编号的子节点
- 参数：
  - n: 编号，可以是数字（负数表示从末尾计数），也可以是类似Python中切片语法的字符串。
  - 示例：```.eq('::2')```等效```.eq('even')```或是```.even()```。
  - 多个参数时取并集，如```.eq(0, 1)```会同时返回编号为0和1的两个子节点，```.eq('odd', '::2')```会返回所有子节点。
- 说明：包含纯文本节点。

```js
assert.deepStrictEqual(root.eq(0, '1::2'), new Token.$.TokenCollection(['a\n', b, c]));
```

**children**([selector: string]): [UniqueCollection](#uniquecollection)<a id="token.children"></a>
- 子节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）：选择器。
- 说明：不包含纯文本节点。

```js
assert.deepStrictEqual(root.children(), new Token.$.UniqueCollection([b, c]));
```

**contains**(token: string\|Token, includingSelf: boolean): boolean<a id="token.contains"></a>
- 判断是否包含另一节点。
- 参数：
  - token: 字符串或非纯文本节点。
  - includingSelf: 是否将同一节点视为互相包含。Default: ```false```

```js
assert(root.contains(b));
assert(root.contains('a\n<ref')); // 参数为字符串时会先执行.text()方法
```

**each**([selector: string], callback: function, [maxDepth: number]): this\|Promise&lt;this&gt;<a id="token.each"></a>
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

**descendants**(selector: string, [maxDepth: number]): [UniqueCollection](#uniquecollection)<a id="token.descendants"></a>
- 子孙节点，可以额外进行[选择器](#选择器)筛选或是限制深度。
- 参数；
  - selector: 选择器。Default: ```''```
  - maxDepth（可选）: 深度，自身（不包含）对应的深度为0。Default: ```Infinity```
- 说明：不包含纯文本节点。

```js
assert.deepStrictEqual(root.descendants(undefined, 1), new Token.$.UniqueCollection([b, c]));
```
  
**has**(selector: string): boolean<a id="token.has"></a>
- 是否存在满足[选择器](#选择器)的子孙节点。
- 参数：
  - selector: 选择器。

```js
assert(root.has('ext-inner') === true);
```
  
**index**(ofType: boolean): number<a id="token.index"></a>
- 在兄弟节点间的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```

```js
assert(b.index() === 1);
assert(b.index(true) === 0);
```
  
**lastIndex**(ofType: boolean): number<a id="token.lastindex"></a>
- 在兄弟节点间从末尾计数的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```

```js
assert(b.lastIndex() === 2);
assert(b.lastIndex(true) === 0);
```
  
**next**([selector: string]): Token\|null<a id="token.next"></a>
- 下一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。

```js
assert(b.next() === '\n');
assert(b.next('') === null);
```
  
**prev**([selector: string]): Token\|null<a id="token.prev"></a>
- 上一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。

```js
assert(b.prev() === 'a\n');
```
  
**nextAll**([selector: string]): [TokenCollection](#tokencollection)<a id="token.nextall"></a>
- 自身之后的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。

```js
assert.deepStrictEqual(b.nextAll(''), new Token.$.TokenCollection(c));
```
  
**prevAll**([selector: string]): [TokenCollection](#tokencollection)<a id="token.prevall"></a>
- 自身之前的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。

```js
assert.deepStrictEqual(b.prevAll(), new Token.$.TokenCollection('a\n'));
```
  
**nextUntil**(selector: string): [TokenCollection](#tokencollection)<a id="token.nextuntil"></a>
- 自身之后、直到某个满足[选择器](#选择器)的节点（不包含）之前的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点。

```js
assert.deepStrictEqual(b.nextUntil('comment'), new Token.$.TokenCollection('\n'));
```
  
**prevUntil**(selector: string): [TokenCollection](#tokencollection)<a id="token.prevuntil"></a>
- 自身之前、直到某个满足[选择器](#选择器)的节点（不包含）之后的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点，且倒序排列。

```js
assert.deepStrictEqual(c.prevUntil('ext'), new Token.$.TokenCollection('\n'));
```
  
**siblings**([selector: string]): [TokenCollection](#tokencollection)<a id="token.siblings"></a>
- 全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。

```js
assert.deepStrictEqual(b.siblings(), new Token.$.TokenCollection(['a\n', '\n', c]));
assert.deepStrictEqual(b.siblings(''), new Token.$.TokenCollection(c));
```
  
**detach**(): this<a id="token.detach"></a>
- 从父节点上脱离。
- 说明：自身仍留有原父节点的索引。

```js
c.detach();
assert(root.contains(c) === false);
assert(c.parent() === root);
```
  
**remove**(): this<a id="token.remove"></a>
- 同时从父节点和所有子节点上脱离。
- 说明：自身仍留有原先父节点和子节点的索引。

```js
b.remove();
assert(inner.parent() === null);
assert(b.length() === 2);
```
  
**insert**(args: string\|Token\|(string\|Token)[], i: number): this<a id="token.insert"></a>
- 在指定位置处插入一些纯文本或非纯文本节点。
- 参数：
  - args: 节点数组。
  - i: 插入起始位置。Default: ```this.$children.length```

```js
root.insert(c, 2);
assert(c.index() === 2);
```

**append**(...args: (string\|Token)[]): this<a id="token.append"></a>
- 在末尾插入新的纯文本或非纯文本节点。

```js
root.append('d');
assert(root.length() === 4);
```

**prepend**(...args: (string\|Token)[]): this<a id="token.prepend"></a>
- 在开头插入新的纯文本或非纯文本节点。

```js
root.prepend(b);
assert(b.index() === 0);
```

**merge**(...args: Token[]): this<a id="token.merge"></a>
- 合并多个根节点。
- 注意：
  - 这个方法只可用于根节点，参数也只能是根节点。
  - 不保证合并后语法的正确性，例如位于前面的根节点可能包含一个未封闭的注释等。

```js
const root2 = Token.parse('a<nowiki>b</nowiki>c');
root.merge(root2);
assert(root.has('#nowiki') === true);
```
  
**delete**(...args: (number\|string\|Token)[]): this<a id="token.delete"></a>
- 删除指定子节点。
- 参数：
  - args: 可以是子节点编号或Python切片，也可以是指定的[Token](#token)对象。

```js
root.delete(-1, c);
assert(root.length() === 3);
```
  
**content**(children: string\|Token\|(string\|Token)[]): this<a id="token.content"></a>
- 完全替换掉全部子节点。
- 参数：
  - children: 新的纯文本或非纯文本子节点。
- 说明：部分扩展Token类可能只接受字符串作为参数，如[NowikiToken](#nowikitoken)和[CommentToken](#commenttoken)。

```js
root.content(c);
assert(root.length() === 1);
```
  
**replaceWith**(token: string\|Token): this<a id="token.replaceWith"></a>
- 将自身在父节点中的位置替换为另一个节点。
- 参数：
  - token: 纯文本或非纯文本节点。

```js
c.replaceWith(b);
assert(root.contains(b) === true);
assert(root.contains(c) === false);
```
  
**sections**([force: boolean]): TokenCollection[]<a id="token.sections"></a>
- 获取各章节。
- 参数：
  - force（可选）: 是否重新计算。

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
  
**section**(n: number): [TokenCollection](#tokencollection)<a id="token.section"></a>
- 获取指定编号的章节。
- 参数：
  - n: 章节编号。

```js
assert.deepStrictEqual(page.section(0), new Token.$.TokenCollection(d));
```

**newSection**(title: string, text: string, [level: number]): this<a id="token.newsection"></a>
- 在末尾插入新的章节。
- 参数：
  - title: 章节标题。
  - text: 章节内容。
  - level: 标题等级。Default: ```2```

```js
page.newSection('Header', 'Content');
assert(page.children('heading#2').at(-1).text() === '==Header==');
```
  
**comment**(): this<a id="token.comment"></a>
- 将自身替换为相同内容的注释。
- 说明：虽然内容相同，但不是同一个节点，注释内部的是纯文本节点。

```js
b.comment();
assert(root.contains(b) === false);
assert(root.text() === '<!--<ref>b</ref>-->');
```

**commentChildren**(start: number, count: number): this<a id="token.commentchildren"></a>
- 将连续子节点替换为相同内容的注释。
- 参数：
  - start: 起始编号。
  - count: 连续子节点个数。Default: ```1```

```js
page.commentChildren(0);
assert(page.$children[0].text() === '<!--d\n-->');
```
  
**nowiki**(): this<a id="token.nowiki"></a>
- 将自身替换为被```<nowiki>```标签包裹的相同内容。
- 说明：虽然内容相同，但不是同一个节点，```<nowiki>```标签内部的是纯文本节点。

```js
root.content(c);
c.nowiki();
assert(root.contains(c) === false);
assert(root.text() === '<nowiki><!-- c --></nowiki>');
```

**nowikiChildren**(start: number, count: number): this<a id="token.nowikichildren"></a>
- 将连续子节点替换为被```<nowiki>```标签包裹的相同内容。
- 参数：
  - start: 起始编号。
  - count: 连续子节点个数。Default: ```1```

```js
page.nowikiChildren(1, 2);
assert(page.$children[1].text() === '<nowiki>==e==\nf\n</nowiki>');
```

## 属性<a id="token.properties"></a>
### 静态属性<a id="token.static.properties"></a>
**config**: string<a id="token.config"></a>
- 维基文本的默认设置JSON路径。
- Default: ```'./config'```

### 实例属性<a id="token.instance.properties"></a>
**$children**: [TokenCollection](#tokencollection)<a id="token.$children"></a>
- 子节点数组

```js
assert.deepStrictEqual(page.$children, new Token.$.TokenCollection(d, e, f, g, h, i, j, k, l));
```

**type**: string<a id="token.type"></a>
- 节点类型
- Default: ```'root'```

```js
assert(root.type === 'root');
```

# TokenCollection

# UniqueCollection

# 选择器
