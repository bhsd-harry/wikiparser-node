# 目录
<details>
    <summary>展开</summary>
   
1. [Parser](#parser)
    1. [方法](#parser.methods)
        1. [parse](#parser.parse)
        2. [isInterwiki](#parser.isinterwiki)
        3. [normalizeTitle](#parser.normalizetitle)
        4. [getTool](#parser.gettool)
    2. [属性](#parser.properties)
        1. [config](#parser.config)
2. [AstElement](#astelement)
    1. [原型方法](#astelement.prototype.methods)
    2. [实例属性](#astelement.instance.properties)
    3. [原型属性](#astelement.prototype.properties)
3. [Token](#token)
    1. [原型方法](#token.prototype.methods)
        1. [destroy](#token.destroy)
        2. [getAncestors](#token.getancestors)
        3. [isPlain](#token.isplain)
        4. [toString](#token.tostring)
        5. [text](#token.text)
        6. [safeReplaceWith](#token.safereplacewith)
        7. [setText](#token.settext)
        8. [sections](#token.sections)
        9. [section](#token.section)
        10. [findEnclosingHtml](#token.findenclosinghtml)
        11. [getCategories](#token.getcategories)
    2. [实例属性](#token.instance.properties)
        1. [type](#token.type)
    3. [原型属性](#token.prototype.properties)
4. [CommentToken](#commenttoken)
    1. [实例属性](#commenttoken.instance.properties)
        1. [closed](#commenttoken.closed)
5. [ExtToken](#exttoken)
    1. [实例属性](#exttoken.instance.properties)
        1. [selfClosing](#exttoken.selfclosing)
        2. [name](#exttoken.name)
6. [AttributeToken](#attributetoken)
    1. [原型方法](#attributetoken.prototype.methods)
        1. [hasAttr](#attributetoken.hasattr)
        2. [getAttr](#attributetoken.getattr)
        3. [getAttrNames](#attributetoken.getattrnames)
        4. [hasAttrs](#attributetoken.hasattrs)
        5. [setAttr](#attributetoken.setattr)
        6. [removeAttr](#attributetoken.removeattr)
        7. [toggleAttr](#attributetoken.toggleattr)
        8. [sanitize](#attributetoken.sanitize)
    2. [实例属性](#attributetoken.instance.properties)
        1. [name](#attributetoken.name)
7. [HeadingToken](#headingtoken)
    1. [原型方法](#headingtoken.prototype.methods)
        1. [setLevel](#headingtoken.setlevel)
    2. [实例属性](#headingtoken.instance.properties)
        1. [name](#headingtoken.name)
8. [ArgToken](#argtoken)
    1. [原型方法](#argtoken.prototype.methods)
        1. [setName](argtoken.setname)
        2. [setDefault](argtoken.setdefault)
    2. [实例属性](argtoken.instance.properties)
        1. [name](argtoken.name)
9. [TranscludeToken](#transcludetoken)
    1. [原型方法](#transcludetoken.prototype.methods)
        1. [subst](#transcludetoken.subst)
        2. [safesubst](#transcludetoken.safesubst)
        3. [getAllArgs](#transcludetoken.getallargs)
        4. [getAnonArgs](#transcludetoken.getanonargs)
        5. [getArgs](#transcludetoken.getargs)
        6. [hasArg](#transcludetoken.hasarg)
        7. [getArg](#transcludetoken.getarg)
        8. [removeArg](#transcludetoken.removearg)
        9. [getKeys](#transcludetoken.getkeys)
        10. [getValues](#transcludetoken.getvalues)
        11. [getValue](#transcludetoken.getvalue)
        12. [newAnonArg](#transcludetoken.newanonarg)
        13. [setValue](#transcludetoken.setvalue)
        14. [anonToNamed](#transcludetoken.anontonamed)
        15. [replaceTemplate](#transcludetoken.replacetemplate)
        16. [hasDuplicatedArgs](#transcludetoken.hasduplicatedargs)
        17. [getDuplicatedArgs](#transcludetoken.getduplicatedargs)
        18. [fixDuplication](#transcludetoken.fixduplication)
        19. [escapeTables](#transcludetoken.escapetables)
    2. [实例属性](#transcludetoken.instance.properties)
        1. [name](#transcludetoken.name)
        2. [modifier](#transcludetoken.modifier)
10. [ParameterToken](#parametertoken)
    1. [原型方法](#parametertoken.prototype.methods)
        1. [getValue](#parametertoken.getvalue)
        2. [setValue](#parametertoken.setvalue)
        3. [rename](#parametertoken.rename)
    2. [实例属性](#parametertoken.instance.properties)
        1. [name](#parametertoken.name)
        2. [anon](#parametertoken.anon)
11. [HtmlToken](#htmltoken)
    1. [原型方法](#htmltoken.prototype.methods)
        1. [replaceTag](#htmltoken.replacetag)
        2. [findMatchingTag](#htmltoken.findmatchingtag)
        3. [fix](#htmltoken.fix)
    2. [实例属性](#htmltoken.instance.properties)
        1. [name](#htmltoken.name)
        2. [closing](#htmltoken.closing)
        3. [selfClosing](#htmltoken.selfclosing)
12. [选择器](#选择器)
    1. [type](#selector.type)
    2. [name](#selector.name)
    3. [属性](#selector.attribute)
    4. [伪选择器](#selector.pseudo)
13. [$ (TokenCollection)](#-tokencollection)
</details>

# Parser
这是解析工具的入口。

```js
var Parser = require('wikiparser-node');
```

## 方法<a id="parser.methods"></a>

**parse**(wikitext: string, include?: boolean = false): [Token](#token)<a id="parser.parse"></a>
- 解析维基文本。

```js
var wikitext = '<includeonly>include</includeonly><noinclude>noinclude</noinclude>',
    include = Parser.parse(wikitext, true),
    noinclude = Parser.parse(wikitext);
assert(include.text() === 'include'); // Token.text()方法只保留有效部分，详见后文Token章节
assert(noinclude.text() === 'noinclude');
```

**isInterwiki**(title: string): RegExpMatchArray<a id="parser.isinterwiki"></a>
- 指定的标题是否是跨维基。

```js
assert(Boolean(Parser.isInterwiki('zhwiki:首页')));
```

**normalizeTitle**(title: string, defaultNs?: number = 0): string<a id="parser.normalizetitle"></a>
- 规范化页面标题。

```js
assert(Parser.normalizeTitle('lj', 10) === 'Template:Lj');
```

**getTool**(): typeof [$](#-tokencollection)<a id="parser.gettool"></a>
- 加载[批量操作工具](#-tokencollection)。

## 属性<a id="parser.properties"></a>

**config**: string<a id="parser.config"></a>
- 指定解析设置JSON文件的相对或绝对路径。

```js
assert(Parser.config === './config/default'); // 这是默认设置的相对路径
```

[返回目录](#目录)

# AstElement
语法树的节点均为字符串或一个仿 HTMLElement 的类 AstElement，这里仅列举这些方法和属性。

## 原型方法<a id="astelement.prototype.methods"></a>
<details>
    <summary>展开</summary>

**isEqualNode**(node: this): boolean  
**cloneNode**(): this  
**hasAttribute**(key: PropertyKey): boolean  
**getAttribute**(key: PropertyKey): string\|undefined  
**getAttributeNames**(): string[]  
**hasAttributes**(): boolean  
**setAttribte**(key: PropertyKey, value: any): this  
**removeAttribute**(key: PropertyKey): void  
**toggleAttribute**(key: PropertyKey, force?: boolean): void  
**hasChildNodes**(): boolean  
**contains**(node: this): boolean  
**removeChild**(node: this): this  
**appendChild**(node: string\|this): string\|this  
**append**(...elements: string\|this): void  
**insertBefore**(node: string\|this, reference: this): string\|this  
**prepend**(...elements: string\|this): void  
**replaceChild**(newChild: string\|this, oldChild: this): this  
**replaceChildren**(...elements: string\|this): void  
**after**(...element: string\|this): void  
**before**(...element: string\|this): void  
**remove**(): void  
**replaceWith**(...elements: string\|this): void  
**normalize**(): void  
**getRootNode**(): this  
**addEventListener**(type: string, listener: (e: event, data: any) => void, options?: {once: boolean}): void  
**removeEventListener**(type: string, listener: (e: event, data: any) => void): void  
**dispatchEvent**(e: event, data: any): void  
**matches**(selector: string): boolean  
**comparePosition**(other: this): number  
**closest**(selector: string): this\|undefined  
**querySelector**(selector: string): this\|undefined  
**querySelectorAll**(selector: string): this[]  
**getBoundingClientRect**(): {height: number, width: number, top: number, left: number}  
**splitText**(i: number, offset: number): string
</details>

## 实例属性<a id="astelement.instance.properties"></a>
<details>
    <summary>展开</summary>

**childNodes**: (string\|this)[] 
</details>

## 原型属性<a id="astelement.prototype.properties"></a>
<details>
    <summary>展开</summary>

**children**: this[]  
**firstChild**: string\|this\|undefined  
**firstElementChild**: this\|undefined  
**lastChild** string\|this\|undefined  
**lastElementChild**: this\|undefined   
**isConnected**: boolean  
**parentNode**: this\|undefined  
**parentElement**: this\|undefined  
**nextSibling**: string\|this\|undefined  
**nextElementSibling**: this\|undefined  
**previousSibling**: string\|this\|undefined  
**previousElementSibling**: this\|undefined  
**hidden**: boolean  
**offsetHeight**: number  
**offsetWidth**: number  
**offsetTop**: number  
**offsetLeft**: number  
**style**: {top: number, left: number, height: number, width: number, padding: number}  
</details>

[返回目录](#目录)

# Token
这是所有解析后的维基文本的基础类。

## 原型方法<a id="token.prototype.methods"></a>
<details>
    <summary>展开</summary>

**destroy**(): void<a id="token.destroy"></a>
- 销毁节点，只能对根节点使用。

**getAncestors**(): Token[]<a id="token.getancestors"></a>
- 获取所有祖先节点。

```js
var root = Parser.parse('<ref/>'),
    attr = root.querySelector('ext-attr');
assert.deepStrictEqual(attr.getAncestors(), [attr.parentElement, root]);
```
   
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
var root = Parser.parse('<!-- a -->{{{||b}}}<br */>');
assert(root.text() === '{{{|}}}<br/>');
```

**setText**(text: string, i: number): void<a id="token.settext"></a>
- 只能通过这个方法修改指定位置上的纯字符串节点。

```js
var root = Parser.parse('');
root.setText('string', 0);
assert(root.toString() === 'string');
```

**safeReplaceWith**(token: Token): void<a id="token.safereplacewith"></a>
- 将节点替换为一个同类节点，相当于[replaceWith](#astelement.prototype.methods)，但适用于父节点有规定的子节点顺序时。
   
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

**findEnclosingHtml**(tag?: string): [Token, Token]<a id="token.findenclosinghtml"></a>
- 搜索包裹当前Token的HTML标签对，不指定`tag`参数时会搜索任意HTML标签。

```js
var root = Parser.parse('<p>{{a}}</p>'),
    template = root.querySelector('template');
assert.deepStrictEqual(template.findEnclosingHtml('p'), [root.firstChild, root.lastChild]);
```

**getCategories**(): [string, string][]<a id="token.getcategories"></a>
- 获取所有分类和对应的排序关键字。
</details>
   
## 实例属性<a id="token.instance.properties"></a>
<details>
    <summary>展开</summary>

**type**: string<a id="token.type"></a>
- 根节点的值为 `root`，其他的基础类节点一般为 `plain`。

```js
var root = Parser.parse(wikitext);
assert(root.type === 'root');
```
</details>

## 原型属性<a id="token.prototype.properties"></a>
<details>
    <summary>展开</summary>

**previousVisibleSibling**: string\|Token\|undefined  
**nextVisibleSibling**: string\|Token\|undefined  
</details>

[返回目录](#目录)
   
# CommentToken
HTML 注释。

## 实例属性<a id="commenttoken.instance.properties"></a>
<details>
    <summary>展开</summary>
   
**closed**: boolean<a id="commenttoken.closed"></a>
- 是否闭合。

```js
var root = Parser.parse('<!-- text'),
    comment = root.firstChild;
assert(comment.closed === false);
```
</details>

[返回目录](#目录)
   
# ExtToken
扩展标签。

## 实例属性<a id="exttoken.instance.properties"></a>
<details>
    <summary>展开</summary>
   
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
</details>

[返回目录](#目录)
   
# AttributeToken
扩展和 HTML 标签及表格的属性。

## 原型方法<a id="attributetoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

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

**setAttr**(key: string, value: string\|boolean): boolean<a id="attributetoken.setattr"></a>
- 设置属性。

```js
var root = Parser.parse('<choose></choose>'),
    attr = root.querySelector('ext-attr');
assert(attr.setAttr('before', 'a') === true);
assert(attr.setAttr('uncached', true) === true);
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

**sanitize**(): void<a id="attributetoken.sanitize"></a>
- 清理无效属性。

```js
var root = Parser.parse('<p ">'),
    attr = root.querySelector('html-attr');
attr.sanitize();
assert(root.toString() === '<p>');
```
</details>
   
## 实例属性<a id="attributetoken.instance.properties"></a>
<details>
    <summary>展开</summary>
   
**name**: string<a id="attributetoken.name"></a>
- 小写的标签名。

```js
var root = Parser.parse('<REF/>'),
    attr = root.querySelector('ext-attr'); // 即使没有设置属性，扩展和 HTML 标签的第一个子节点也总是 AttributeToken
assert(attr.name === 'ref');
```
</details>

[返回目录](#目录)

# HeadingToken
章节标题。

## 原型方法<a id="headingtoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

**setLevel**(n: number): void<a id="headingtoken.setlevel"></a>
- 修改标题层级。

```js
var root = Parser.parse('==a=='),
    header = root.firstChild;
header.setLevel(3);
assert(root.toString() === '===a===');
```
</details>
   
## 实例属性<a id="headingtoken.instance.properties"></a>
<details>
    <summary>展开</summary>
   
**name**: string<a id="headingtoken.name"></a>
- 字符串格式的标题层级。

```js
var root = Parser.parse('==a=='),
    header = root.firstChild;
assert(header.name === '2');
```
</details>

[返回目录](#目录)

# ArgToken
被 `{{{}}}` 包裹的模板参数。

## 原型方法<a id="argtoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

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
</details>

## 实例属性<a id="argtoken.instance.properties"></a>
<details>
    <summary>展开</summary>

**name**: string<a id="argtoken.name"></a>
- 参数名。

```js
var root = Parser.parse('{{{a}}}'),
    arg = root.firstChild;
assert(arg.name === 'a');
```
</details>

[返回目录](#目录)

# TranscludeToken
模板或魔术字。

## 原型方法<a id="transcludetoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

**subst**(): void<a id="transcludetoken.subst"></a>  
**safesubst**(): void<a id="transcludetoken.safesubst"></a>
- 将引用方式修改为替换引用。

```js
var root = Parser.parse('{{a}}{{!}}'),
    template = root.firstChild,
    magicWord = root.lastChild;
template.subst();
magicWord.safesubst();
assert(root.toString() === '{{subst:a}}{{safesubst:!}}');
```

**getAllArgs**(): [ParameterToken](#parametertoken)[]<a id="transcludetoken.getallargs"></a>
- 获取所有参数。

```js
var root = Parser.parse('{{a|b|c=1}}{{#invoke:d|e|f|g=1}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert.deepStrictEqual(template.getAllArgs(), template.children.slice(1));
assert.deepStrictEqual(invoke.getAllArgs(), invoke.children.slice(3));
```

**getAnonArgs**(): [ParameterToken](#parametertoken)[]<a id="transcludetoken.getanonargs"></a>
- 获取所有匿名参数。

```js
var root = Parser.parse('{{a|b|c=1}}{{#invoke:d|e|f|g=1}}{{#if:x|y|z}}'),
    [template, invoke, magicWord] = root.children;
assert.deepStrictEqual(template.getAnonArgs(), template.children.slice(1, 2));
assert.deepStrictEqual(invoke.getAnonArgs(), invoke.children.slice(3, 4));
assert.deepStrictEqual(magicWord.getAnonArgs(), magicWord.children.slice(1)); // 除#invoke外的魔术字的参数总是视为匿名参数
```

**getArgs**(key: string\|number): Set\<[ParameterToken](#parametertoken)><a id="transcludetoken.getargs"></a>
- 获取指定名称的参数（含重复），注意顺序可能不固定。

```js
var root = Parser.parse('{{a|b|1=c}}{{#invoke:d|e|f|1=g}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert.deepStrictEqual(template.getArgs(1), new Set(template.children.slice(1)));
assert.deepStrictEqual(invoke.getArgs(1), new Set(invoke.children.slice(3)));
```

**hasArg**(key: string\|number): boolean<a id="transcludetoken.hasarg"></a>
- 是否带有指定参数。

```js
var root = Parser.parse('{{a|b|c=1}}{{#invoke:d|e|f|g=1}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert(template.hasArg(1) === true);
assert(template.hasArg('c') === true);
assert(invoke.hasArg(1) === true);
assert(invoke.hasArg('g') === true);
```

**getArg**(key: string\|number): [ParameterToken](#parametertoken)<a id="transcludetoken.getarg"></a>
- 获取指定名称的有效参数（即最后一个）。

```js
var root = Parser.parse('{{a|b|1=c}}{{#invoke:d|e|1=f|g}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert(template.getArg(1) === template.lastChild);
assert(invoke.getArg(1) === invoke.lastChild);
```

**removeArg**(key: string\|number): void<a id="transcludetoken.removearg"></a>
- 移除指定名称的参数（含重复）。

```js
var root = Parser.parse('{{a|b|1=c}}{{#invoke:d|e|f|1=g}}'),
    template = root.firstChild,
    invoke = root.lastChild;
template.removeArg(1);
invoke.removeArg(1);
assert(root.toString() === '{{a}}{{#invoke:d|e}}');
```

**getKeys**(): string[]<a id="transcludetoken.getkeys"></a>
- 获取所有参数名。

```js
var root = Parser.parse('{{a|b=1|c=2}}{{#invoke:d|e|f=1|g=2}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert.deepStrictEqual(template.getKeys(), ['b', 'c']);
assert.deepStrictEqual(invoke.getKeys(), ['f', 'g']);
```

**getValues**(key: string\|number): string[]<a id="transcludetoken.getvalues"></a>
- 获取指定名称的参数值（含重复）。

```js
var root = Parser.parse('{{a|b|1=c}}{{#invoke:d|e|f|1=g}}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert.deepStrictEqual(template.getValues(1), ['b', 'c']);
assert.deepStrictEqual(invoke.getValues(1), ['f', 'g']);
```

**getValue**(key: string\|number): string<a id="transcludetoken.getvalue"></a>
- 获取指定名称的有效参数值（即最后一个）。

```js
var root = Parser.parse('{{a|b|1= c }}{{#invoke:d|e|1=f| g }}'),
    template = root.firstChild,
    invoke = root.lastChild;
assert(template.getValue(1) === 'c'); // 模板的命名参数不保留首尾的空白字符
assert(invoke.getValue(1) === ' g '); // #invoke魔术字保留匿名参数首位的空白字符
```

**newAnonArg**(val: any): void<a id="transcludetoken.newanonarg"></a>
- 在末尾添加新的匿名参数。

```js
var root = Parser.parse('{{a|b}}{{#invoke:d|e}}'),
    template = root.firstChild,
    invoke = root.lastChild;
template.newAnonArg(' c ');
invoke.newAnonArg(' f ');
assert(root.toString() === '{{a|b| c }}{{#invoke:d|e| f }}');
```

**setValue**(key: string, value: any): void<a id="transcludetoken.setvalue"></a>
- 修改或新增参数。

```js
var root = Parser.parse('{{a|b}}{{#invoke:e|f|g=3}}'),
    template = root.firstChild,
    invoke = root.lastChild;
template.setValue('1', ' c ');
template.setValue('d', ' 2 ');
invoke.setValue('g', ' 4 ');
assert(root.toString() === '{{a| c |d= 2 }}{{#invoke:e|f|g= 4 }}');
```

**anonToNamed**(): void<a id="transcludetoken.anontonamed"></a>
- 将所有匿名参数修改为对应的命名参数。

```js
var root = Parser.parse('{{a| b | c }}{{#invoke:d|e| f }}'),
    template = root.firstChild,
    invoke = root.lastChild;
template.anonToNamed();
invoke.anonToNamed();
assert(root.toString() === '{{a|1= b |2= c }}{{#invoke:d|e|1= f }}'); // 注意改成命名参数后会参数值的首尾空白字符失效
```

**replaceTemplate**(title: string): void<a id="transcludetoken.replacetemplate"></a>
- 更换模板，但保留参数。

```js
var root = Parser.parse('{{a|b|c=1}}'),
    template = root.firstChild;
template.replaceTemplate('aa');
assert(root.toString() === '{{aa|b|c=1}}');
```

**hasDuplicatedArgs**(): number<a id="transcludetoken.hasduplicatedargs"></a>
- 重复参数计数。

```js
var root = Parser.parse('{{a||1=}}'),
    template = root.firstChild;
assert(template.hasDuplicatedArgs() === 1);
```

**getDuplicatedArgs**(): \[string, Set\<[ParameterToken](#parametertoken)>][]<a id="transcludetoken.getduplicatedargs"></a>
- 获取全部重复参数，注意顺序可能不固定。

```js
var root = Parser.parse('{{a||1=}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.getDuplicatedArgs(), [['1', new Set(template.getAllArgs())]]);
```

**fixDuplication**(): string[]<a id="transcludetoken.fixduplication"></a>
- 尝试修复重复参数，返回值为无法修复的参数名列表。

```js
var root = Parser.parse('{{a|b|1=|1=c}}'),
    template = root.firstChild;
assert.deepStrictEqual(template.fixDuplication(), ['1']); // 
assert(root.toString() === '{{a|b|1=c}}');
```

**escapeTables**(): this<a id="transcludetoken.escapetables"></a>
- 如果内部包含疑似未转义的表格语法且因此造成了重复参数，则对这些表格进行转义。

```js
var root = Parser.parse('{{a|b=c\n{|\n|rowspan=2|d\n|rowspan=2|e\n|}}}'),
    template = root.firstChild;
template.escapeTables();
assert(root.toString() === '{{a|b=c\n{{(!}}\n{{!}}rowspan=2{{!}}d\n{{!}}rowspan=2{{!}}e\n{{!}}}}}');
```
</details>

## 实例属性<a id="transcludetoken.instance.properties"></a>
<details>
    <summary>展开</summary>

**name**: string<a id="transcludetoken.name"></a>
- 模板名（含名字空间）或魔术字。

```js
var root = Parser.parse('{{a}}{{!}}'),
    template = root.firstChild,
    magicWord = root.lastChild;
assert(template.name === 'Template:A');
assert(magicWord.name === '!');
```

**modifier**: string<a id="transcludetoken.modifier"></a>
- subst 和 safesubst 等。

```js
var root = Parser.parse('<includeonly>{{subst:REVISIONUSER}}</includeonly>', true),
    magicWord = root.querySelector('magic-word');
assert(magicWord.modifier === 'subst');
```
</details>

[返回目录](#目录)

# ParameterToken
模板或魔术字的参数。

## 原型方法<a id="parametertoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

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
    throw new Error();
} catch (e) {
    assert(e.message === '参数更名造成重复参数：c');
}
```
</details>

## 实例属性<a id="parametertoken.instance.properties"></a>
<details>
    <summary>展开</summary>

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
</details>

[返回目录](#目录)

# HtmlToken
HTML标签，未进行匹配。

## 原型方法<a id="htmltoken.prototype.methods"></a>
<details>
    <summary>展开</summary>

**replaceTag**(tag: string): void<a id="htmltoken.replacetag"></a>
- 修改标签。

```js
var root = Parser.parse('<b>'),
    html = root.firstChild;
html.replaceTag('i');
assert(root.toString() === '<i>');
```

**findMatchingTag**(): HtmlToken<a id="htmltoken.findmatchingtag"></a>
- 搜索匹配的另一个标签，找不到或无效自封闭时会抛出不同错误。

```js
var root = Parser.parse('<p><b/></i><u></u><br>'),
    [p, b, i, u, u2, br] = root.children;  
try {
    p.findMatchingTag();
    throw new Error();
} catch (e) {
    assert(e.message === '未闭合的标签：<p>');
}
try {
    b.findMatchingTag();
    throw new Error();
} catch (e) {
    assert(e.message === '无效自封闭标签：<b/>');
}
try {
    i.findMatchingTag();
    throw new Error();
} catch (e) {
    assert(e.message === '未匹配的闭合标签：</i>');
}
assert(u.findMatchingTag() === u2);
assert(br.findMatchingTag() === br);
```

**fix**(): void<a id="htmltoken.fix"></a>
- 尝试修复无效自封闭标签，无法修复时会抛出错误。

```js
var root = Parser.parse('<b>a<b/><div style="height:1em"/>');
for (const html of root.querySelectorAll('html')) {
    html.fix();
}
assert(root.toString() === '<b>a</b><div style="height:1em"></div>');
```
</details>

## 实例属性<a id="htmltoken.instance.properties"></a>
<details>
    <summary>展开</summary>

**name**: string<a id="htmltoken.name"></a>
- 小写的标签名。

```js
var root = Parser.parse('<b>'),
    html = root.firstChild;
assert(html.name === 'b');
```

**closing**: boolean<a id="htmltoken.closing"></a>
- 是否是闭合标签。

```js
var root = Parser.parse('</b>'),
    html = root.firstChild;
assert(html.closing === true);
```

**selfClosing**: boolean<a id="htmltoken.selfclosing"></a>
- 是否是自闭合标签（可能不符合HTML5规范）。

```js
var root = Parser.parse('<b/>'),
    html = root.firstChild;
assert(html.selfClosing === true);
```
</details>

[返回目录](#目录)

# 选择器
Token 选择器的设计仿照了 CSS 和 jQuery 的选择器。
<details>
    <summary>展开</summary>

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
assert(comment.matches(':empty') === true);
assert(comment.matches(':hidden') === true);
assert(root.matches(':visible') === true);
```
</details>

[返回目录](#目录)

# $ (TokenCollection)
这是一个仿 jQuery 的批量操作工具，这里仅列举方法和属性。
<details>
    <summary>展开</summary>

**toArray**(): (string\|Token)[]  
**get**(num: number): string\|Token  
**each**(callback: function(this: string\|Token, number, string\|Token): void): this  
**map**(callback: function(this: string\|Token, number, string\|Token): any): any[]\|TokenCollection  
**slice**(start: number, end: number): TokenCollection  
**first**(): TokenCollection  
**last**(): TokenCollection  
**eq**(i: number): TokenCollection  
**toString**(): string  
**text**(text?: string): string\|this  
**is**(selector: string): boolean  
**filter**(selector: string\|function(this: string\|Token, number, string\|Token): boolean): TokenCollection  
**not**(selector: string\|function(this: string\|Token, number, string\|Token): boolean): TokenCollection  
**find**(selector: string): TokenCollection  
**has**(selector: string): boolean  
**closest**(selector?: string): TokenCollection  
**index**(): number  
**add**(elements: string\|Token\|TokenCollection\|(string\|Token)[]): TokenCollection  
**addBack**(selector?: string): TokenCollection  
**parent**(selector?: string): TokenCollection  
**parents**(selector?: string): TokenCollection  
**parentsUntil**(selector?: string, filter?: string): TokenCollection  
**next**(selector?: string): TokenCollection  
**nextAll**(selector?: string): TokenCollection  
**nextUntil**(selector?: string, filter?: string): TokenCollection  
**prev**(selector?: string): TokenCollection  
**prevAll**(selector?: string): TokenCollection  
**prevUntil**(selector?: string, filter?: string): TokenCollection  
**siblings**(selector?: string): TokenCollection  
**children**(selector?: string): TokenCollection  
**contents**(): TokenCollection  
**data**(key: string\|Record\<string, any>, value?: any): this\|any  
**removeData**(name: string\|string[]): this  
**on**(events: string\|Record\<string, (e: Event, data: any) => any, [selector: string], handler: (e: Event, data: any) => any): this  
**one**(events: string\|Record\<string, (e: Event, data: any) => any, [selector: string], handler: (e: Event, data: any) => any): this  
**off**(events: string\|Record\<string, (e: Event, data: any) => any, [selector: string], [handler: (e: Event, data: any) => any]): this  
**trigger**(event: Event, data?: any): this  
**tiggerHandler**(event: Event, data?: any): any  
**append**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**prepend**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**before**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**after**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**html**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**replaceWith**(content: string\|Token\|TokenCollection\|(string\|Token)[]\|function(this: Token, number, string): string\|Token\|TokenCollection\|(string\|Token)[]): this  
**remove**(selector?: string): this  
**detach**(selector?: string): this  
**empty**(): this  
**appendTo**(target: Token\|Token[]): this  
**prependTo**(target: Token\|Token[]): this  
**insertBefore**(target: Token\|Token[]): this  
**insertAfter**(target: Token\|Token[]): this  
**replaceAll**(target: Token\|Token[]): this  
**val**(value: string\|string[]\|function(this: Token, number, string): string): this  
**attr**(name: string\|Record\<string, string>, value?: string): this\|string  
**removeAttr**(name: string): this  
**prop**(name: string\|Record\<string, any>, value?: any): this\|any  
**removeProp**(name: string): this  
**wrapAll**(wrapper: string[]\|function(this: Token, string): string[]): this  
**wrapInner**(wrapper: string[]\|function(this: Token, string): string[]): this  
**wrap**(wrapper: string[]\|function(this: Token, string): string[]): this  

</details>

[返回目录](#目录)
