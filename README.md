# 目录
1. [Token](#token)
   1. [静态方法](#token.static.methods)
      1. [parse](#token.parse)
      2. [normalizeTitle](#token.normalizetitle)
   2. [原型方法](#token.prototype.methods)
      1. [isPlain](#token.isplain)
      2. [length](#token.length)
      3. [text](#token.text)
      4. [is](#token.is)
      5. [not](#token.not)
      6. [parent](#token.parent)
      7. [closest](#token.closest)
      8. [parents](#token.parents)
      9. [parentsUntil](#token.parentsuntil)
      10. [even](#token.even)
      11. [odd](#token.odd)
      12. [eq](#token.eq)
      13. [children](#token.children)
      14. [contains](#token.contains)
      15. [each](#token.each)
      16. [descendants](#token.descendants)
      17. [has](#token.has)
      18. [index](#token.index)
      19. [lastIndex](#token.lastindex)
      20. [next](#token.next)
      21. [prev](#token.prev)
      22. [nextAll](#token.nextall)
      23. [prevAll](#token.prevall)
      24. [nextUntil](#token.nextuntil)
      25. [prevUntil](#token.prevuntil)
      26. [siblings](#token.siblings)
      27. [detach](#token.detach)
      28. [remove](#token.remove)
      29. [insert](#token.insert)
      30. [append](#token.append)
      31. [prepend](#token.prepend)
      32. [merge](#token.merge)
      33. [delete](#token.delete)
      34. [content](#token.content)
      35. [replaceWith](#token.replacewith)
      36. [sections](#token.sections)
      37. [section](#token.section)
      38. [newSection](#token.newsection)
      39. [comment](#token.comment)
      40. [commentChildren](#token.commentchildren)
      41. [nowiki](#token.nowiki)
      42. [nowikiChildren](#token.nowikichildren)
   3. [静态属性](#token.static.properties)
      1. [config](#token.config)
   4. [实例属性](#token.instance.properties)
      1. [$children](#token.$children)
      2. [type](#token.type)
2. [CommentToken](#commenttoken)
   1. [原型方法](#commenttoken.prototype.methods)
      1. [empty](#commenttoken.empty)
      2. [close](#commenttoken.close)
   2. [实例属性](#commenttoken.instance.properties)
      1. [closed](#commenttoken.closed)
3. [ExtToken](#exttoken)
   1. [原型方法](#exttoken.prototype.methods)
      1. [hide](#exttoken.hide)
      2. [show](#exttoken.show)
      3. [getAttr](#exttoken.getattr)
      4. [removeAttr](#exttoken.removeattr)
      5. [setAttr](#exttoken.setattr)
   2. [实例属性](#exttoken.instance.properties)
      1. [selfClosing](#exttoken.selfclosing)
      2. [name](#exttoken.name)
4. [AttributeToken](#attributetoken)
   1. [原型方法](#attributetoken.prototype.methods)
      1. [getAttr](#attributetoken.getattr)
      2. [removeAttr](#attributetoken.removeattr)
      3. [setAttr](#attributetoken.setattr)
   2. [实例属性](#attributetoken.instance.properties)
      1. [name](#attributetoken.name)
5. [TokenCollection](#tokencollection)
6. [UniqueCollection](#uniquecollection)
7. [选择器](#选择器)

# Token
这是所有解析后的维基文本的基础类，同时也是一个可迭代对象，迭代器会依次返回[$children](#token.$children)属性的各个元素。
[返回目录](#目录)

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
  - args: 可以是子节点编号或Python切片，也可以是指定的Token对象。

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
  
**replaceWith**(token: string\|Token): this<a id="token.replacewith"></a>
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

# CommentToken
这是一个用于HTML注释的扩展类。请使用[Token.parse](#token.parse)方法获取CommentToken实例。
[返回目录](#目录)

```js
const commentText = '<!-- comment '; // 维基文本允许未封闭的注释
const [comment] = Token.parse(commentText);
assert(comment.text() === commentText);
```

## 方法<a id="commentoken.methods"></a>
### 原型方法<a id="commenttoken.prototype.methods"></a>
**empty**(): this<a id="commenttoken.empty"></a>
- 清空注释内容。
- 注意：不会清除注释节点。

```js
comment.empty();
assert(comment.text() === '<!--');
```

**close**(): this<a id="commenttoken.close"></a>
- 封闭注释。如果原本注释就是封闭的话没有效果。

```js
comment.close();
assert(comment.text() === '<!---->');
```

## 属性<a id="commenttoken.properties"></a>
### 实例属性<a id="commenttoken.instance.properties"></a>
**closed**: boolean<a id="commenttoken.closed"></a>
- 是否封闭。

```js
assert(comment.closed === true);
```

# ExtToken
这是一个用于扩展标签的扩展类。请使用[Token.parse](#token.parse)方法获取ExtToken实例。
[返回目录](#目录)

```js
const extText = '<ref group="a">ref</ref><references group = a/>';
const [ref, references] = Token.parse(extText);
assert(ref.text() === '<ref group="a">ref</ref>');
assert(references.text() === '<references group = a/>');
```

## 方法<a id="exttoken.methods"></a>
### 原型方法<a id="exttoken.prototype.methods"></a>
**hide**(): this<a id="exttoken.hide"></a>
- 更改为自封闭。
- 注意：不会清除原本的内部Token，但转换为文字时不会显示。

```js
ref.hide();
assert(ref.text() === '<ref group="a"/>');
```

**show**([inner: Token]): this<a id="exttoken.show"></a>
- 取消自封闭，并可以同时更新内部Token。如果参数为空且原本有非空的内部Token，则现在转换为文字时会显示出来。
- 参数：
  - inner（可选）: 新的内部Token。注意需要符合该扩展标签的要求，比如```<nowiki>```标签内部必须是[NowikiToken](#nowikitoken)。

```js
ref.show();
assert(ref.text() === '<ref group="a">ref</ref>');
```

**getAttr**(key: string): string<a id="exttoken.getattr"></a>
- 获得指定的标签属性。
- 参数：
  - key: 属性名。

```js
assert(ref.getAttr('group') === 'a');
```

**removeAttr**([key: string]): this<a id="exttoken.removeattr"></a>
- 清除指定的标签属性，参数为空时清除所有属性。
- 参数：
  - key（可选）: 属性名。

```js
ref.removeAttr('name');
assert(ref.text() === '<ref group="a">ref</ref>');
ref.removeAttr();
assert(ref.text() === '<ref>ref</ref>');
```

**setAttr**(key: string, value: string): this<a id="exttoken.setattr"></a>
- 设定标签属性。
- 参数：
  - key: 属性名。
  - value: 属性值。

```js
ref.setAttr('name', 'name')
assert(ref.text() === '<ref name="name">ref</ref>');
```

## 属性<a id="exttoken.properties"></a>
### 实例属性<a id="exttoken.instance.properties"></a>
**selfClosing**: boolean<a id="exttoken.selfclosing"></a>
- 是否自封闭。

```js
assert(references.selfClosing === true);
```

**name**: boolean<a id="exttoken.name"></a>
- 转换为全小写的标签名。这是一个只读属性。

```js
assert(references.name === 'references');
```
# AttributeToken
这是扩展和HTML标签属性的扩展类。这个类的文字一般情况下应以空白字符开头。这个类的特殊之处在于使用属性选择器时，对应的属性是解析出的标签属性而非通常的实例属性，详见[属性选择器](#属性选择器)。请使用[Token.parse](#token.parse)方法分别获取扩展标签的AttributeToken实例和HTML标签的AttributeToken实例。
[返回目录](#目录)

```js
const [attr] = references;
assert(attr.text() === ' group = a');
assert(attr.is('[group=a]') === true);
assert(attr.is('[type=ext-attr]') === false);
```

## 方法<a id="attributetoken.methods"></a>
### 原型方法<a id="attributetoken.prototype.methods"></a>
**getAttr**(key: string): string<a id="attributetoken.getattr"></a>
- 参见[ExtToken.getAttr](#exttoken.getattr)

**removeAttr**([key: string]): this<a id="attributetoken.removeattr"></a>
- 参见[ExtToken.removeAttr](#exttoken.removeattr)

**setAttr**(key: string, value: string): this<a id="attributetoken.setattr"></a>
- 参见[ExtToken.setAttr](#exttoken.setattr)

## 属性<a id="exttoken.properties"></a>
### 实例属性<a id="exttoken.instance.properties"></a>
**name**: boolean<a id="attributetoken.name"></a>
- 转换为全小写的标签名。

```js
assert(attr.name === 'references');
```

# TokenCollection
[返回目录](#目录)

# UniqueCollection
[返回目录](#目录)

# 选择器
[返回目录](#目录)
