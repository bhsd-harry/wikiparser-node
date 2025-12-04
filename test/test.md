## AstElement

```js
// length
assert.strictEqual(Parser.parse('{{a}}b').length, 2);
```

```js
// append
var root = Parser.parse('a');
root.append('b', 'c');
assert.equal(root, 'abc');
```

```js
// insertAt
var root = Parser.parse('a');
root.insertAt('b', 0);
assert.equal(root, 'ba');
```

```js
// insertAt (main)
var a = Parser.parse('a'),
	b = Parser.parse('b');
a.insertAt(b.firstChild);
assert.equal(a, 'ab');
```

```js
// querySelector
var root = Parser.parse('a{{p}}{{i}}'),
	[, p] = root.childNodes;
assert.equal(p, '{{p}}');
assert.strictEqual(root.querySelector('template'), p);
```

```js
// querySelectorAll
var root = Parser.parse('{{{|{{p}}}}}a{{i}}'),
	{firstChild: {lastChild: {firstChild}}, lastChild} = root;
assert.equal(firstChild, '{{p}}');
assert.equal(lastChild, '{{i}}');
assert.deepStrictEqual(root.querySelectorAll('template'), [
	firstChild,
	lastChild,
]);
```

```js
// removeAt
var root = Parser.parse('{{a}}b');
assert.equal(root.removeAt(1), 'b');
assert.equal(root, '{{a}}');
```

```js
// replaceChildren (main)
var root = Parser.parse('a{{b}}');
root.replaceChildren('c', 'd');
assert.equal(root, 'cd');
```

```js
// setText
var root = Parser.parse('{{a}}b');
root.setText('c', -1);
assert.equal(root, '{{a}}c');
```

```js
// text
assert.strictEqual(Parser.parse('<!--a-->b{{c}}').text(), 'b{{c}}');
```

## AstNode

```js
// childNodes
var root = Parser.parse('{{a}}b'),
	{firstChild, lastChild} = root;
assert.equal(firstChild, '{{a}}');
assert.equal(lastChild, 'b');
assert.deepStrictEqual(root.childNodes, [firstChild, lastChild]);
assert.deepStrictEqual(lastChild.childNodes, []);
```

```js
// firstChild
var root = Parser.parse('a'),
	{firstChild} = root;
assert.equal(firstChild, 'a');
assert.strictEqual(firstChild.firstChild, undefined);
```

```js
// lastChild
var root = Parser.parse('a'),
	{lastChild} = root;
assert.equal(lastChild, 'a');
assert.strictEqual(lastChild.lastChild, undefined);
```

```js
// nextSibling
var {firstChild, lastChild} = Parser.parse('{{a}}b');
assert.equal(firstChild, '{{a}}');
assert.equal(lastChild, 'b');
assert.strictEqual(firstChild.nextSibling, lastChild);
assert.strictEqual(lastChild.nextSibling, undefined);
```

```js
// parentNode
var root = Parser.parse('a'),
	{firstChild} = root;
assert.equal(firstChild, 'a');
assert.strictEqual(firstChild.parentNode, root);
assert.strictEqual(root.parentNode, undefined);
```

```js
// previousSibling
var {firstChild, lastChild} = Parser.parse('{{a}}b');
assert.equal(firstChild, '{{a}}');
assert.equal(lastChild, 'b');
assert.strictEqual(lastChild.previousSibling, firstChild);
assert.strictEqual(firstChild.previousSibling, undefined);
```

```js
// after (main)
var root = Parser.parse('a'),
	{firstChild} = root;
firstChild.after('b', 'c');
assert.equal(root, 'abc');
```

```js
// before (main)
var root = Parser.parse('a'),
	{firstChild} = root;
firstChild.before('b', 'c');
assert.equal(root, 'bca');
```

```js
// remove (main)
var root = Parser.parse('x\n{{a|b}}\n\ny'),
	[, template] = root.childNodes,
	{lastChild} = template;
assert.equal(template, '{{a|b}}');
assert.equal(lastChild, 'b');
lastChild.remove();
assert.equal(template, '{{a}}');
template.remove(true);
assert.equal(root, 'x\n\ny');
```

## AstText

```js
// data
var {firstChild} = Parser.parse('a');
assert.strictEqual(firstChild.data, 'a');
```

```js
// type
var {firstChild} = Parser.parse('a');
assert.strictEqual(firstChild.type, 'text');
```

```js
// deleteData (main)
var {firstChild} = Parser.parse('abcd');
firstChild.deleteData(-2, 1);
assert.equal(firstChild, 'abd');
firstChild.deleteData(2);
assert.equal(firstChild, 'ab');
firstChild.deleteData(-1, 2);
assert.equal(firstChild, 'a');
```

```js
// replaceData
var {firstChild} = Parser.parse('a');
firstChild.replaceData('b');
assert.equal(firstChild, 'b');
```

## Title

```js
// main
var title = Parser.normalizeTitle('template:birth_ date:mm');
assert.strictEqual(title.main, 'Birth date:mm');
title.main = 'birth_month';
assert.strictEqual(title.main, 'Birth month');
```

```js
// ns
assert.strictEqual(Parser.normalizeTitle(':File:a', 10).ns, 6);
assert.strictEqual(Parser.normalizeTitle('File:a', 10).ns, 6);
assert.strictEqual(Parser.normalizeTitle('A', 10).ns, 10);
assert.strictEqual(Parser.normalizeTitle('../a', 10).ns, 0);
```

```js
// prefix
assert.strictEqual(Parser.normalizeTitle('A').prefix, '');
assert.strictEqual(Parser.normalizeTitle('Wikipedia:A').prefix, 'Project:');
```

```js
// title
assert.strictEqual(
	Parser.normalizeTitle('user talk:a b').title,
	'User_talk:A_b',
);
```

```js
// valid
assert.ok(!Parser.normalizeTitle('').valid);
assert.ok(!Parser.normalizeTitle('#a').valid);
assert.ok(!Parser.normalizeTitle('<').valid);
assert.ok(!Parser.normalizeTitle('&#60;').valid);
assert.ok(!Parser.normalizeTitle('%3c').valid);
assert.ok(Parser.normalizeTitle('a#a<').valid);
assert.ok(!Parser.normalizeTitle('&amp;nbsp;').valid);
assert.ok(!Parser.normalizeTitle('&#x25;25').valid);
assert.ok(!Parser.normalizeTitle('::a').valid);
assert.ok(Parser.normalizeTitle(':a').valid);
assert.ok(!Parser.normalizeTitle('./a').valid);
assert.ok(!Parser.normalizeTitle('a/..').valid);
assert.ok(Parser.normalizeTitle('../a').valid);
assert.ok(!Parser.normalizeTitle('<nowiki/>a').valid);
assert.ok(Parser.normalizeTitle('{{a}}').valid);
assert.ok(!Parser.normalizeTitle('{{!}}').valid);
```

## NowikiBaseToken

```js
// innerText
var {firstChild} = Parser.parse('<!-- a -->');
assert.equal(firstChild, '<!-- a -->');
assert.strictEqual(firstChild.innerText, ' a ');
```

## CommentToken

```js
// closed
var {firstChild} = Parser.parse('<!-- a');
assert.equal(firstChild, '<!-- a');
assert.ok(!firstChild.closed);
firstChild.closed = true;
assert.equal(firstChild, '<!-- a-->');
```

## TagPairToken

```js
// closed
var {firstChild} = Parser.parse('<includeonly> a');
assert.equal(firstChild, '<includeonly> a');
assert.ok(!firstChild.closed);
firstChild.closed = true;
assert.equal(firstChild, '<includeonly> a</includeonly>');
({firstChild} = Parser.parse('<pre/>'));
assert.equal(firstChild, '<pre/>');
assert.ok(firstChild.closed);
```

```js
// selfClosing
var {firstChild} = Parser.parse('<nowiki>a</nowiki>');
assert.equal(firstChild, '<nowiki>a</nowiki>');
assert.ok(!firstChild.selfClosing);
firstChild.selfClosing = true;
assert.equal(firstChild, '<nowiki/>');
```

## HeadingToken

```js
// level
var {firstChild} = Parser.parse('==a==');
assert.equal(firstChild, '==a==');
assert.strictEqual(firstChild.level, 2);
```

## Token

```js
// type
assert.strictEqual(Parser.parse('').type, 'root');
```

## ParameterToken

```js
// name
var [anonymous, named] = Parser.parse('{{a|b|c=}}')
	.querySelectorAll('parameter');
assert.equal(anonymous, 'b');
assert.equal(named, 'c=');
assert.strictEqual(anonymous.name, '1');
assert.strictEqual(named.name, 'c');
```

```js
// anon
var [anonymous, named] = Parser.parse('{{a|b|c=}}')
	.querySelectorAll('parameter');
assert.equal(anonymous, 'b');
assert.equal(named, 'c=');
assert.ok(anonymous.anon);
assert.ok(!named.anon);
```

```js
// getValue (main)
var [anonymous, named] = Parser.parse('{{a| b | c = 1 }}')
	.querySelectorAll('parameter');
assert.equal(anonymous, ' b ');
assert.equal(named, ' c = 1 ');
assert.strictEqual(anonymous.getValue(), ' b '); // 模板的匿名参数保留首尾的空白字符
assert.strictEqual(named.getValue(), '1'); // 模板的命名参数不保留首尾的空白字符
```

```js
// setValue (main)
var parameter = Parser.parse('{{a|b=1}}').querySelector('parameter');
assert.equal(parameter, 'b=1');
parameter.setValue(' 2 ');
assert.equal(parameter, 'b= 2 '); // setValue方法总是保留空白字符，哪怕是无效的
```

## TranscludeToken

```js
// modifier
var magicWord = Parser
	.parse('<includeonly>{{subst:REVISIONUSER}}</includeonly>', true)
	.querySelector('magic-word');
assert.equal(magicWord, '{{subst:REVISIONUSER}}');
assert.strictEqual(magicWord.modifier, 'subst:');
```

```js
// name
var {firstChild, lastChild} = Parser.parse('{{a}}{{!}}');
assert.equal(firstChild, '{{a}}');
assert.equal(lastChild, '{{!}}');
assert.strictEqual(firstChild.name, 'Template:A');
assert.strictEqual(lastChild.name, '!');
```

```js
// setModifier
var {firstChild} = Parser.parse('{{a}}');
assert.equal(firstChild, '{{a}}');
firstChild.setModifier('subst:');
assert.equal(firstChild, '{{subst:a}}');
```

```js
// isTemplate
var {firstChild, lastChild} = Parser.parse('{{a}}{{!}}');
assert.equal(firstChild, '{{a}}');
assert.equal(lastChild, '{{!}}');
assert.ok(firstChild.isTemplate());
assert.ok(!lastChild.isTemplate());
```

```js
// getAllArgs
var {firstChild} = Parser.parse('{{a|b|c=1}}');
assert.equal(firstChild, '{{a|b|c=1}}');
assert.deepStrictEqual(
	firstChild.getAllArgs(),
	firstChild.querySelectorAll('parameter'),
);
```

```js
// getAnonArgs
var {firstChild} = Parser.parse('{{a|b|c=1}}');
assert.equal(firstChild, '{{a|b|c=1}}');
assert.deepStrictEqual(
	firstChild.getAnonArgs(),
	[firstChild.querySelector('parameter')],
);
```

```js
// getArgs
var {firstChild} = Parser.parse('{{a|b|1=c}}');
assert.equal(firstChild, '{{a|b|1=c}}');
assert.deepStrictEqual(
	firstChild.getArgs(1),
	new Set(firstChild.querySelectorAll('parameter')),
);
```

```js
// getArg (main)
var {firstChild} = Parser.parse('{{a|b|1=c}}');
assert.equal(firstChild, '{{a|b|1=c}}');
assert.strictEqual(firstChild.getArg(1), firstChild.lastChild);
```

```js
// getValue (main)
var {firstChild} = Parser.parse('{{a|b|1=c}}');
assert.equal(firstChild, '{{a|b|1=c}}');
assert.deepStrictEqual(firstChild.getValue(1), 'c');
```

```js
// setValue (main)
var {firstChild} = Parser.parse('{{a|b}}');
assert.equal(firstChild, '{{a|b}}');
firstChild.setValue('1', 'c');
firstChild.setValue('2', 'd', true);
firstChild.setValue('e', '', true);
assert.equal(firstChild, '{{a|c|2=d\n|e=}}');
```
