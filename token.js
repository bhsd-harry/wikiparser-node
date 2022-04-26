/**
 * PHP解析器的步骤：
 * 1. 替换签名和{{subst:}}，参见Parser::preSaveTransform；这在revision中不可能保留，可以跳过
 * 2. 移除特定字符\x7f和\x00，参见Parser::parse
 * 3. 注释/扩展标签（'<'相关）和模板/模板变量/转换（'{'相关，注意rightmost法则，以及'|'是否属于内链），并标记有效换行，
 *    参见Preprocessor_Hash::buildDomTreeArrayFromText
 * 4. HTML标签（允许不匹配），参见Sanitizer::internalRemoveHtmlTags
 * 5. 表格，参见Parser::handleTables
 * 6. 水平线和状态开关，参见Parser::internalParse
 * 7. 标题，参见Parser::handleHeadings
 * 8. 内链，含文件和分类，参见Parser::handleInternalLinks2
 * 9. 外链，参见Parser::handleExternalLinks
 * 10. ISBN、RFC和自由外链，参见handleMagicLinks
 * 11. 段落和列表，参见BlockLevelPass::execute
 */

class Token extends Array {
	type;
	parsed;

	constructor(token = []) {
		if (typeof token === 'string') {
			super(0);
			this.push(token.replace(/[\x7f\x00]/g, '')); // eslint-disable-line no-control-regex
			this.type = 'plain';
			this.parsed = false;
		} else {
			throw new TypeError('仅接受String作为输入参数！');
		}
	}

	toString() {
		return this.join('');
	}
}

module.exports = Token;
