# v1.0.3

2023-12-05

First TypeScript version

# v1.1.0

2023-12-11

**Added**

- New properties and methods for [`Title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title) objects: `extension`, `toSubjectPage`, `toTalkPage`, `isTalkPage`, `toBasePage`, `toRootPage`  

**Fixed**

- Wrapping the text after the last `</onlyinclude>` in a `NoincludeToken`.
- Replacing remaining spaces in [`Title.title`](https://github.com/bhsd-harry/wikiparser-node/wiki/Title#title) property with underscores  
- [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) now maintains its content after `insertNode`, `deleteContents`, `extractContents` and `cloneContents` methods

**Changed**

- `startContainer` and `endContainer` properties of [`AstRange`](https://github.com/bhsd-harry/wikiparser-node/wiki/AstRange) now must be siblings  

**Removed**

- `AstRange.intersectsNode` method  
