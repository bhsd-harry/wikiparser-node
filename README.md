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
8. [TranscludeToken](#transcludetoken)
    1. [原型方法](#transcludetoken.prototype.methods)
        1. [getAllArgs](#transcludetoken.getallargs)
        2. [getAnonArgs](#transcludetoken.getanonargs)
        3. [getArgs](#transcludetoken.getargs)
        4. [hasArg](#transcludetoken.hasarg)
        5. [getArg](#transcludetoken.getarg)
        6. [removeArg](#transcludetoken.removearg)
        7. [getKeys](#transcludetoken.getkeys)
        8. [getValues](#transcludetoken.getvalues)
        9. [getValue](#transcludetoken.getvalue)
        10. [newAnonArg](#transcludetoken.newanonarg)
        11. [setValue](#transcludetoken.setvalue)
        12. [anonToNamed](#transcludetoken.anontonamed)
        13. [replaceTemplate](#transcludetoken.replacetemplate)
    2. [实例属性](#transcludetoken.instance.properties)
        1. [name](#transcludetoken.name)
9. [ParameterToken](#parametertoken)
    1. [原型方法](#parametertoken.prototype.methods)
        1. [getValue](#parametertoken.getvalue)
        2. [setValue](#parametertoken.setvalue)
        3. [rename](#parametertoken.rename)
    2. [实例属性](#parametertoken.instance.properties)
        1. [name](#parametertoken.name)
        2. [anon](#parametertoken.anon)
10. [选择器](#选择器)
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
var root = Parser.parse(wikitext);
assert(root.isPlain() === true); // 根节点总是基础类
```

**toString**(): string<a id ="token.tostring"></a>
- 还原为完整的维基文本。

```js
var root = Parser.parse(wikitext);
assert(root.toString() === wikitext); // 解析是可逆的
```

**text**(): string<a id="token.text"></a>
- 移除不可见的维基文本，包括 HTML 注释、仅用于嵌入的文字（即 `<includeonly>` 或 `<onlyinclude>` 标签内部）、无效的标签属性等。

```js
var root = Parser.parse('<includeonly>a</includeonly><!-- b --><noinclude>c</noinclude>');
assert(root.text() === 'c');
```
   
**sections**(): Token\[\]\[\]<a id="token.sections"></a>
- 将页面分割为章节，每个章节对应一个 Token 数组。

```js
var root = Parser.parse('a\n==b==\nc\n===d===\n'),
    {childNodes} = root,
    sections = root.sections();
assert.deepStrictEqual(sections, [childNodes.slice(0, 1), childNodes.slice(1), childNodes.slice(3)]);
```
  
**section**(n: number): Token\[\]<a id="token.section"></a>
- 仅获取指定章节。

```js
var root = Parser.parse('a\n==b==\nc\n===d===\n'),
    section = root.section(0); // 序言对应的编号为 0
assert.deepStrictEqual(section, [root.firstChild]);
```
   
## 实例属性<a id="token.instance.properties"></a>

**type**: string<a id="token.type"></a>
- 根节点的值为 `root`，其他的基础类节点一般为 `plain`。

```js
var root = Parser.parse(wikitext);
assert(root.type === 'root');
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
assert(ref.selfClosing === true);
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
assert(attr.hasAttr('uncached') === true);
assert(attr.hasAttr('before') === true);
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

# TranscludeToken
模板或魔术字。

## 对象方法<a id="transcludetoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

**getAllArgs**(): ParameterToken[]<a id="transcludetoken.getallargs"></a>
- 获取所有参数。

```js
var root = Parser.parse('{{a|b|c=1}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.getAllArgs(), template.children.slice(1));
```

**getAnonArgs**(): ParameterToken[]<a id="transcludetoken.getanonargs"></a>
- 获取所有匿名参数。

```js
var root = Parser.parse('{{a|b|c=1}}{{#if:x|y|z}}'),
    template = root.firstChild,
    magicWord = root.lastChild;
assert.deepStrictEqual(template.getAnonArgs(), template.chidren.slice(1, 2));
assert.deepStrictEqual(magicWord.getAnonArgs(), magicWord.children.slice(1)); // 目前魔术字的参数总是视为匿名参数
```

**getArgs**(key: string\|number): Set\<ParameterToken><a id="transcludetoken.getargs"></a>
- 获取指定名称的参数（含重复）。

```js
var root = Parser.parse('{{a|b|1=c}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.getArgs(1), new Set(template.children.slice(1)));
```

**hasArg**(key: string\|number): boolean<a id="transcludetoken.hasarg"></a>
- 是否带有指定参数。

```js
var root = Parser.parse('{{a|b|c=1}}'),
    template = root.firstChild;
assert(template.hasArg(1) === true);
assert(template.hasArg('c') === true);
```

**getArg**(key: string\|number): ParameterToken<a id="transcludetoken.getarg"></a>
- 获取指定名称的有效参数（即最后一个）。

```js
var root = Parser.parse('{{a|b|1=c}}'),
    template = root.firstChild;
assert(template.getArg(1) === template.lastChild);
```

**removeArg**(key: string\|number): void<a id="transcludetoken.removearg"></a>
- 移除指定名称的参数（含重复）。

```js
var root = Parser.parse('{{a|b|1=c}}'),
    template = root.firstChild;
template.removeArg(1);
assert(root.toString() === '{{a}}');
```

**getKeys**(): string[]<a id="transcludetoken.getkeys"></a>
- 获取所有参数名。

```js
var root = Parser.parse('{{a|b=1|c=2}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.getKeys(), ['b', 'c']);
```

**getValues**(key: string\|number): string[]<a id="transcludetoken.getvalues"></a>
- 获取指定名称的参数值（含重复）。

```js
var root = Parser.parse('{{a|b|1=c}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.getValues(1), ['b', 'c']);
```

**getValue**(key: string\|number): string<a id="transcludetoken.getvalue"></a>
- 获取指定名称的有效参数值（即最后一个）。

```js
var root = Parser.parse('{{a|b|1=c}}'),
    template = root.firstChild;
assert(template.getValue(1) === 'c');
```

**newAnonArg**(val: any): void<a id="transcludetoken.newanonarg"></a>
- 在末尾添加新的匿名参数。

```js
var root = Parser.parse('{{a|b}}'),
    template = root.firstChild;
template.newAnonArg(' c ');
assert(root.toString() === '{{a|b| c }}');
```

**setValue**(key: string, value: any): void<a id="transcludetoken.setvalue"></a>
- 修改或新增参数。

```js
var root = Parser.parse('{{a|b}}'),
    template = root.firstChild;
template.setValue('1', ' c ');
template.setValue('d', ' 2 ');
assert(root.toString() === '{{a| c |d= 2 }}');
```

**anonToNamed**(): void<a id="transcludetoken.anontonamed"></a>
- 将所有匿名参数修改为对应的命名参数。

```js
var root = Parser.parse('{{a| b | c }}'),
    template = root.firstChild;
template.anonToNamed();
assert(root.toString() === '{{a|1= b |2= c }}'); // 注意改成命名参数后会参数值的首尾空白字符失效
```

**replaceTemplate**(title: string): void<a id="transcludetoken.replacetemplate"></a>
- 更换模板，但保留参数。

```js
var root = Parser.parse('{{a|b|c=1}}'),
    template = root.firstChild;
template.replaceTemplate('aa');
assert(root.toString() === '{{aa|b|c=1}}');
```
</details>

## 实例属性<a id="transcludetoken.instance.properties"></a>

**name**: string<a id="transcludetoken.name"></a>
- 模板名（含名字空间）或魔术字。

```js
var root = Parser.parse('{{a}}{{!}}'),
    template = root.firstChild,
    magicWord = root.lastChild;
assert(template.name === 'Template:A');
assert(magicWord.name === '!');
```

# ParameterToken
模板或魔术字的参数。

## 对象方法<a id="parametertoken.prototype.methods"></a>

**getValue**(): string<a id="parametertoken.getvalue"></a>
- 获取参数值。

```js
var root = Parser.parse('{{a| b | c = 1 }}'),
    [anonymous, named] = root.querySelectorAll('parameter');
assert(anonymous.getValue() === ' b '); // 模板的匿名参数保留首尾的空白字符
assert(named.getValue() === '1'); // 模板的命名参数不保留首尾的空白字符
```

**setValue**(value: any): void<a id="parametertoken.setvalue"></a>
- 设置参数值。

```js
var root = Parser.parse('{{a|b=1}}'),
    param = root.querySelector('parameter');
param.setValue(' 2 ');
assert(root.toString() === '{{a|b= 2 }}'); // setValue方法总是保留空白字符，哪怕是无效的
```

**rename**(key: string, force: boolean): void<a id="parametertoken.rename"></a>
- 重命名参数，可选是否在导致重复参数时抛出错误。

```js
var root = Parser.parse('{{a|b=1|c=2}}'),
    param = root.querySelector('parameter');
try {
    param.rename('c');
} catch (e) {
    assert(e.message === '参数更名造成重复参数：c');
}
```

## 实例属性<a id="parametertoken.instance.properties"></a>

**name**: string<a id="parametertoken.name"></a>
- 参数名。

```js
var root = Parser.parse('{{a|b| c = 1}}'),
    [anonymous, named] = root.querySelectorAll('parameter');
assert(anonymous.name === '1');
assert(named.name === 'c');
```

**anon**: boolean<a id="parametertoken.anon"></a>
- 是否是匿名参数。

```js
var root = Parser.parse('{{a|b| c = 1}}'),
    [anonymous, named] = root.querySelectorAll('parameter');
assert(anonymous.anon === true);
assert(named.anon === false);
```

# 选择器
Token 选择器的设计仿照了 CSS 和 jQuery 的选择器。

**type**<a id="selector.type"></a>
- 类比 CSS tag 选择器。

```js
var root = Parser.parse(wikitext);
assert(root.matches('root') === true)
```

**name**<a id="selector.name"></a>
- 类比 CSS id 选择器。

```js
var root = Parser.parse('<ref/>'),
    ref = root.firstChild;
assert(ref.matches('#ref') === true);
```

**属性**<a id="selector.attribute"></a>
- 类比 CSS 属性选择器。

```js
var root = Parser.parse('<!-- --><ref name="abc"/>'),
    comment = root.firstChild,
    attr = root.querySelector('ext-attr');
assert(comment.matches('[closed]') === true); // 非 AttributeToken 的属性选择器对应自身属性
assert(attr.matches('[name^=a]') === true); // AttributeToken 的属性选择器对应维基文本中的属性
assert(attr.matches('[name$=c]') === true);
assert(attr.matches('[name*=b]') === true);
assert(attr.matches('[name!=x]') === true);
assert(attr.matches('[name=abc]') === true);
```

**伪选择器**<a id="selector.pseudo"></a>
- 类比 CSS 和 jQuery 伪选择器。

```js
var root = Parser.parse('text <!--'),
    comment = root.lastChild;
assert(root.matches(':root') === true);
assert(root.matches(':is(root)') === true);
assert(comment.matches(':not(root)') === true);
assert(comment.matches(':nth-child(2)') === true);
assert(comment.matches(':nth-last-of-type(1)') === true);
assert(comment.matches(':last-child') === true);
assert(comment.matches(':first-of-type') === true);
assert(root.matches(':only-child') === true);
assert(comment.matches(':only-of-type') === true);
assert(root.matches(':contains(text)') === true);
assert(root.matches(':has(comment)') === true);
assert(root.matches(':parent') === true);
assert(comment.matches(':hidden') === true);
assert(root.matches(':visible') === true);
```
