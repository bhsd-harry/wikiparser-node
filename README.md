# 目录
<details>
    <summary>展开</summary>
   
1. [Parser](#parser)
    1. [方法](#parser.methods)
        1. [parse](#parser.parse)
        2. [normalizeTitle](#parser.normalizetitle)
2. [Token](#token)
    1. [原型方法](#token.prototype.methods)
        1. [isPlain](#token.isplain)
        2. [toString](#token.tostring)
        3. [text](#token.text)
        4. [sections](#token.sections)
        5. [section](#token.section)
    2. [实例属性](#token.instance.properties)
        1. [type](#token.type)
3. [CommentToken](#commenttoken)
    1. [实例属性](#commenttoken.instance.properties)
        1. [closed](#commenttoken.closed)
4. [ExtToken](#exttoken)
    1. [实例属性](#exttoken.instance.properties)
        1. [selfClosing](#exttoken.selfclosing)
        2. [name](#exttoken.name)
5. [AttributeToken](#attributetoken)
    1. [原型方法](#attributetoken.prototype.methods)
        1. [hasAttr](#attributetoken.hasattr)
        2. [getAttr](#attributetoken.getattr)
        3. [getAttrNames](#attributetoken.getattrnames)
        4. [hasAttrs](#attributetoken.hasattrs)
        5. [setAttr](#attributetoken.setattr)
        6. [removeAttr](#attributetoken.removeattr)
        7. [toggleAttr](#attributetoken.toggleattr)
    2. [实例属性](#attributetoken.instance.properties)
        1. [name](#attributetoken.name)
6. [HeadingToken](#headingtoken)
    1. [原型方法](#headingtoken.prototype.methods)
        1. [setLevel](#headingtoken.setlevel)
    2. [实例属性](#headingtoken.instance.properties)
        1. [name](#headingtoken.name)
7. [ArgToken](#argtoken)
    1. [原型方法](#argtoken.prototype.methods)
        1. [setName](argtoken.setname)
        2. [setDefault](argtoken.setdefault)
    2. [实例属性](argtoken.instance.properties)
        1. [name](argtoken.name)
8. [选择器](#选择器)
    1. [type](#selector.type)
    2. [name](#selector.name)
    3. [属性](#selector.attribute)
    4. [伪选择器](#selector.pseudo)
    </details>

# Parser
这是解析工具的入口。

```js
var Parser = require('.');
```

## 方法<a id="parser.methods"></a>

**parse**(wikitext: string): Token<a id="parser.parse"></a>
- 解析维基文本。

```js
var root = Parser.parse(wikitext);
```

**normalizeTitle**(title: string, defaultNs: number): string<a id="parser.normalizetitle"></a>
- 规范化页面标题。

```js
assert(Parser.normalizeTitle('lj', 10) === 'Template:Lj'); // 模板调用的默认名字空间编号是 10
```

# Token
这是所有解析后的维基文本的基础类。

## 原型方法<a id="token.prototype.methods"></a>
   
**isPlain**(): boolean<a id="token.isplain"></a>
- 是否是基础类（即未拓展的 Token）。

```js
assert(Parser.parse(wikitext).isPlain()); // 根节点总是基础类
```

**toString**(): string<a id ="token.tostring"></a>
- 还原为完整的维基文本。

```js
assert(Parser.parse(wikitext).toString() === wikitext); // 解析是可逆的
```

**text**(): string<a id="token.text"></a>
- 移除不可见的维基文本，包括 HTML 注释、仅用于嵌入的文字（即 `<includeonly>` 或 `<onlyinclude>` 标签内部）、无效的标签属性等。

```js
assert(Parser.parse('<includeonly>a</includeonly><!-- b --><noinclude>c</noinclude>').text() === 'c');
```
   
**sections**(): Token\[\]\[\]<a id="token.sections"></a>
- 将页面分割为章节，每个章节对应一个 Token 数组。

```js
var sections = Parser.parse(wikitext).sections();
```
  
**section**(n: number): Token\[\]<a id="token.section"></a>
- 仅获取指定章节。

```js
var section = Parser.parse(wikitext).section(0); // 序言对应的编号为 0
```
   
## 实例属性<a id="token.instance.properties"></a>

**type**: string<a id="token.type"></a>
- 根节点的值为 `root`，其他的基础类节点一般为 `plain`。

```js
assert(Parser.parse(wikitext).type === 'root');
```
   
# CommentToken
HTML 注释。

## 实例属性<a id="commenttoken.instance.properties"></a>
   
**closed**: boolean<a id="commenttoken.closed"></a>
- 是否闭合。

```js
var root = Parser.parse('<!-- text'),
    comment = root.firstChild; // Token API 模仿了 HTMLElement API
assert(comment.closed === false);
```
   
# ExtToken
扩展标签。

## 实例属性<a id="exttoken.instance.properties"></a>
   
**selfClosing**: boolean<a id="exttoken.selfclosing"></a>
- 是否自封闭。

```js
var root = Parser.parse('<ref/>'),
    ref = root.firstChild;
assert(ref.selfClosing);
```

**name**: string<a id="exttoken.name"></a>
- 小写的标签名。

```js
var root = Parser.parse('<REF/>'),
    ref = root.firstChild;
assert(ref.name === 'ref');
```
   
# AttributeToken
扩展和 HTML 标签属性。

## 原型方法<a id="attributetoken.prototype.methods"></a>

**hasAttr**(key: string): boolean<a id="attributetoken.hasattr"></a>
- 是否带有指定属性。

```js
var root = Parser.parse('<choose uncached before="a"></choose>'),
    attr = root.querySelector('ext-attr'); // 扩展标签属性的 type 值为 'ext-attr'
assert(attr.hasAttr('uncached'));
assert(attr.hasAttr('before'));
```
   
**getAttr**(key: string): string\|boolean<a id="attributetoken.getattr"></a>
- 获取指定属性。

```js
var root = Parser.parse('<choose uncached before="a"></choose>'),
    attr = root.querySelector('ext-attr');
assert(attr.getAttr('uncached') === true);
assert(attr.getAttr('before') === 'a');
```

**getAttrNames**(): string\[\]<a id="attributetoken.getattrnames"></a>
- 获取属性名列表。

```js
var root = Parser.parse('<ref name="a"/>'),
    attr = root.querySelector('ext-attr');
assert.deepStrictEqual(attr.getAttrNames(), ['name']);
```

**hasAttrs**(): boolean<a id="attributetoken.hasattrs"></a>
- 是否带有至少一条属性。

```js
var root = Parser.parse('<ref/>'),
    attr = root.querySelector('ext-attr');
assert(attr.hasAttrs() === false);
```

**setAttr**(key: string, value: string\|boolean): this<a id="attributetoken.setattr"></a>
- 设置属性。

```js
var root = Parser.parse('<choose></choose>'),
    attr = root.querySelector('ext-attr');
attr.setAttr('before', 'a').setAttr('uncached', true);
assert(root.toString() === '<choose before="a" uncached></choose>');
```

**removeAttr**(key: string): void<a id="attributetoken.removeattr"></a>
- 移除指定属性。

```js
var root = Parser.parse('<ref name="a"/>'),
    attr = root.querySelector('ext-attr');
attr.removeAttr('name');
assert(root.toString() === '<ref/>');
```

**toggleAttr**(key: string): void<a id="attributetoken.toggleattr"></a>
- 切换某 Boolean 属性。

```js
var root = Parser.parse('<choose uncached></choose>'),
    attr = root.querySelector('ext-attr');
attr.toggleAttr('uncached');
assert(root.toString() === '<choose></choose>');
attr.toggleAttr('uncached');
assert(root.toString() === '<choose uncached></choose>');
```
   
## 实例属性<a id="attributetoken.instance.properties"></a>
   
**name**: string<a id="attributetoken.name"></a>
- 小写的标签名。

```js
var root = Parser.parse('<REF/>'),
    attr = root.querySelector('ext-attr'); // 即使没有设置属性，扩展和 HTML 标签的第一个子节点也总是 AttributeToken
assert(attr.name === 'ref');
```

# HeadingToken
章节标题。

## 原型方法<a id="headingtoken.prototype.methods"></a>

**setLevel**(n: number): void<a id="headingtoken.setlevel"></a>
- 修改标题层级。

```js
var root = Parser.parse('==a=='),
    header = root.firstChild;
header.setLevel(3);
assert(root.toString() === '===a===');
```
   
## 实例属性<a id="headingtoken.instance.properties"></a>
   
**name**: string<a id="headingtoken.name"></a>
- 字符串格式的标题层级。

```js
var root = Parser.parse('==a=='),
    header = root.firstChild;
assert(header.name === '2');
```

# ArgToken
被 `{{{}}}` 包裹的模板参数。

## 原型方法<a id="argtoken.prototype.methods"></a>

**setName**(name: any): void<a id="argtoken.setname"></a>
- 修改参数名。

```js
var root = Parser.parse('{{{a}}}'),
    arg = root.firstChild;
arg.setName('b');
assert(root.toString() === '{{{b}}}');
```

**setDefault**(value: any): void<a id="argtoken.setdefault"></a>
- 设置或修改参数预设值。

```js
var root = Parser.parse('{{{a}}}'),
    arg = root.firstChild;
arg.setDefault('b');
assert(root.toString() === '{{{a|b}}}');
```

## 实例属性<a id="argtoken.instance.properties"></a>

**name**: string<a id="argtoken.name"></a>
- 参数名。

```js
var root = Parser.parse('{{{a}}}'),
    arg = root.firstChild;
assert(arg.name === 'a');
```

# 选择器
Token 选择器的设计仿照了 CSS 和 jQuery 的选择器。

**type**<a id="selector.type"></a>
- 类比 CSS tag 选择器。

```js
var root = Parser.parse(wikitext);
assert(root.matches('root'))
```

**name**<a id="selector.name"></a>
- 类比 CSS id 选择器。

```js
var root = Parser.parse('<ref/>'),
    ref = root.firstChild;
assert(ref.matches('#ref'));
```

**属性**<a id="selector.attribute"></a>
- 类比 CSS 属性选择器。

```js
var root = Parser.parse('<!-- --><ref name="abc"/>'),
    comment = root.firstChild,
    attr = root.querySelector('ext-attr');
assert(comment.matches('[closed]')); // 非 AttributeToken 的属性选择器对应自身属性
assert(attr.matches('[name^=a]')); // AttributeToken 的属性选择器对应维基文本中的属性
assert(attr.matches('[name$=c]'));
assert(attr.matches('[name*=b]'));
assert(attr.matches('[name!=x]'));
assert(attr.matches('[name=abc]'));
```

**伪选择器**<a id="selector.pseudo"></a>
- 类比 CSS 和 jQuery 伪选择器。

```js
var root = Parser.parse('text <!--'),
    comment = root.lastChild;
assert(root.matches(':root'));
assert(root.matches(':is(root)'));
assert(comment.matches(':not(root)'));
assert(comment.matches(':nth-child(2)'));
assert(comment.matches(':nth-last-of-type(1)'));
assert(comment.matches(':last-child'));
assert(comment.matches(':first-of-type'));
assert(root.matches(':only-child'));
assert(comment.matches(':only-of-type'));
assert(root.matches(':contains(text)'));
assert(root.matches(':has(comment)'));
assert(root.matches(':parent'));
assert(comment.matches(':hidden'));
assert(root.matches(':visible'));
```
