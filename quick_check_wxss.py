#!/usr/bin/env python3
"""
快速WXSS语法检查工具
专门检查常见的WXSS语法错误
"""

import os
import re

def check_wxss_syntax(filepath):
    """检查WXSS文件语法"""
    errors = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # 跳过空行和注释
            if not line_stripped or line_stripped.startswith('/*') or line_stripped.startswith('*'):
                continue
            
            # 检查属性名后缺少冒号
            if re.search(r'\w+\s+[^{}\s]', line) and not re.search(r'\w+:\s', line):
                # 可能是选择器，不是属性
                if not line_stripped.endswith('{') and ':' not in line:
                    errors.append({
                        'line': i,
                        'content': line_stripped,
                        'type': '可能的语法错误',
                        'message': '属性声明可能缺少冒号'
                    })
            
            # 检查不正确的括号匹配
            open_parens = line.count('(')
            close_parens = line.count(')')
            if open_parens != close_parens:
                errors.append({
                    'line': i,
                    'content': line_stripped,
                    'type': '括号不匹配',
                    'message': f'左括号: {open_parens}, 右括号: {close_parens}'
                })
            
            # 检查不正确的分号使用
            if line_stripped and not line_stripped.endswith(';') and not line_stripped.endswith('{') and not line_stripped.endswith('}') and ':' in line:
                # 检查是否是多行属性
                if not any(keyword in line for keyword in ['linear-gradient', 'radial-gradient', 'url']):
                    errors.append({
                        'line': i,
                        'content': line_stripped,
                        'type': '缺少分号',
                        'message': '属性声明末尾缺少分号'
                    })
        
        return errors
        
    except Exception as e:
        return [{'line': 0, 'content': str(e), 'type': '文件错误', 'message': '无法读取文件'}]

def main():
    filepath = "pages/editor/index.wxss"
    print(f"检查 {filepath} 的语法...")
    
    errors = check_wxss_syntax(filepath)
    
    if not errors:
        print("✅ 未发现明显的语法错误")
        return
    
    print(f"\n发现 {len(errors)} 个问题:")
    for error in errors:
        print(f"行 {error['line']}: {error['type']}")
        print(f"  内容: {error['content']}")
        print(f"  问题: {error['message']}")
        print()

if __name__ == "__main__":
    main()