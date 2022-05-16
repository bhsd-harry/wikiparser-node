# Token
## 属性
### 实例属性
**$children**: [TokenCollection](#tokencollection)
- 子节点数组

**type**: string
- 节点类型
- Default: ```'root'```

### 静态属性
**config**: string
- 维基文本的默认设置JSON路径。
- Default: ```'./config'```

## 方法
### 原型方法
**isPlain**(): boolean
- 是否是普通节点（即与根节点相同）。

**length**(): number
- 子节点数。

**text**(): string
- 将解析后的维基文本转换为纯文字。

**is**(selector: string): boolean
- 判断节点是否满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。
- 说明：纯文本节点总是返回```false```。

**not**(selector: string): boolean
- 判断节点是否不满足[选择器](#选择器)。
- 参数：
  - selector: 选择器。
- 说明：纯文本节点总是返回```false```。

**parent**([selector: string]): Token|null
- 父节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。

**closest**(selector: string): Token|null
- 最近的满足[选择器](#选择器)的祖先节点。
- 参数：
  - selector: 选择器。

**parents**([selector: string]): [TokenCollection](#tokencollection)
- 祖先节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）: 选择器。

**parentsUntil**(selector: string): [TokenCollection](#tokencollection)
- 直到某个满足[选择器](#选择器)的节点（不包含）为止的祖先节点。
- 参数：
  - selector: 选择器。

**even**(): [TokenCollection](#tokencollection)
- 偶数编号的子节点。
- 说明：包含纯文本节点。

**odd**(): [TokenCollection](#tokencollection)
- 奇数编号的子节点。
- 说明：包含纯文本节点。

**eq**(n: number|string): [TokenCollection](#tokencollection)
- 指定编号的子节点
- 参数：
  - n: 编号，可以是数字（负数表示从末尾计数），也可以是类似Python中切片语法的字符串。
  - 示例：```.eq('::2')```等效```.eq('even')```或是```.even()```。
  - 多个参数时取并集，如```.eq(0, 1)```会同时返回编号为0和1的两个子节点，```.eq('odd', '::2')```会返回所有子节点。
- 说明：包含纯文本节点。

**children**([selector: string]): [TokenCollection](#tokencollection)
- 子节点，可以额外进行[选择器](#选择器)筛选。
- 参数：
  - selector（可选）：选择器。
- 说明：不包含纯文本节点。

**contains**(token: string|Token, includingSelf: boolean): boolean
- 判断是否包含另一节点。
- 参数：
  - token: 纯文本或非纯文本节点。
  - includingSelf: 是否将同一节点视为互相包含。Default: ```false```

**each**([selector: string], callback: function, [maxDepth: number]): this|Promise<this>
- 遍历子孙节点进行操作，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
  - callback: 回调函数。可以是异步函数，此时方法返回的是个Promise。
  - maxDepth（可选）: 遍历深度，自身对应的深度为0。Default: ```Infinity```
- 说明：不会遍历纯文本节点。遍历顺序为广度优先。

**descendants**([selector: string], [maxDepth: number]): [TokenCollection](#tokencollection)
- 子孙节点，可以额外进行[选择器](#选择器)筛选或是限制深度。
- 参数；
  - selector（可选）: 选择器。
  - maxDepth（可选）: 深度，自身（不包含）对应的深度为0。Default: ```Infinity```
- 说明：不包含纯文本节点。
  
**has**(selector: string): boolean
- 是否存在满足[选择器](#选择器)的子孙节点。
- 参数：
  - selector: 选择器。
  
**index**(ofType: boolean): number
- 在兄弟节点间的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```
  
**lastIndex**(ofType: boolean): number
- 在兄弟节点间从末尾计数的编号。
- 参数：
  - ofType: 是否只计数相同type的节点。Default: ```false```
  
**next**([selector: string]): Token|null
- 下一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
  
**prev**([selector: string]): Token|null
- 上一个兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
  
**nextAll**([selector: string]): [TokenCollection](#tokencollection)
- 自身之后的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
  
**prevAll**([selector: string]): [TokenCollection](#tokencollection)
- 自身之前的全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
  
**nextUntil**(selector: string): [TokenCollection](#tokencollection)
- 自身之后、直到某个满足[选择器](#选择器)的节点（不包含）之前的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点。
  
**prevUntil**(selector: string): [TokenCollection](#tokencollection)
- 自身之前、直到某个满足[选择器](#选择器)的节点（不包含）之后的全部兄弟节点。
- 参数；
  - selector: 选择器。
- 说明：总是包含纯文本节点，且倒序排列。
  
**siblings**([selector: string]): [TokenCollection](#tokencollection)
- 全部兄弟节点，可以额外进行[选择器](#选择器)筛选。
- 参数；
  - selector（可选）: 选择器。
- 说明：只有不设选择器时才包含纯文本节点。
  
**emit**(name: string, [...args: any[]]): this
- 触发事件。
- 参数：
  - name: 事件名。
  - args（可选）: 事件数据。
  
**on**(name: string, callback: function): this
- 处理事件。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
  
**once**(name: string, callback: function): this
- 类似on方法，但事件处理器只会执行一次。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
  
**off**(name: string, callback: function): this
- 移除指定的事件处理器。
- 参数：
  - name: 事件名。
  - callback: 回调函数。
  
**listeners**(name: string): function[]
- 列出指定名称下的全部事件处理器。
- 参数：
  - name: 事件名。
  
**detach**(): this
- 从父节点上脱离。
- 说明：自身仍留有原父节点的索引。
  
**remove**(): this
- 同时从父节点和所有子节点上脱离。
- 说明：自身仍留有原先父节点和子节点的索引。
  
**insert**(args: (string|Token)[], i: number): this
- 在指定位置处插入一些纯文本或非纯文本节点。
- 参数：
  - args: 节点数组。
  - i: 插入起始位置。Default: ```this.$children.length```

**append**(...args: (string|Token)[]): this
- 在末尾插入新的纯文本或非纯文本节点。

**prepend**(...args: (string|Token)[]): this
- 在开头插入新的纯文本或非纯文本节点。
  
**delete**(...args: (number|string|Token)[]): this
- 删除指定子节点。
- 参数：
  - args: 可以是子节点编号或Python切片，也可以是指定的[Token](#token)对象。
  
**content**(children: string|Token|(string|Token)[]): this
- 完全替换掉全部子节点。
- 参数：
  - children: 新的纯文本或非纯文本子节点。
  
**replaceWith**(token: string|Token): this
- 将自身在父节点中的位置替换为另一个节点。
- 参数：
  - token: 纯文本或非纯文本节点。
  
**sections**([force: boolean]): TokenCollection[]
- 获取各章节。
- 参数：
  - force（可选）: 是否重新生成。
  
**section**(n: number): [TokenCollection](#tokencollection)
- 获取指定编号的章节。
- 参数：
  - n: 章节编号。
  
**comment**(): this
- 将自身替换为相同内容的注释。
- 说明：虽然内容相同，但不是同一个节点，注释内部的是纯文本节点。
  
**nowiki**(): this
- 将自身替换为被```<nowiki>```标签包裹的相同内容。
- 说明：虽然内容相同，但不是同一个节点，```<nowiki>```标签内部的是纯文本节点。

### 静态方法
**parse**(wikitext: string, n: number, config: object): [Token](#token)
- 解析文本。
- 参数:
  - wikitext: 文本。
  - n: 解析层级，详见token.js开头的注释。Default: ```MAX_STAGE = 11```
  - config: 设置。Default: ```require(Token.config)```

**normalizeTitle**(title: string, defaultNs: number, config: object): string
- 规范化页面标题。
- 参数:
  - title: 原始标题。
  - defaultNs: 默认名字空间。Default: ```0```
  - config: 设置。Default: ```require(Token.config)```

# TokenCollection

# 选择器
