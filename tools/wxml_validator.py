#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WXML语法检查器
用于检查微信小程序WXML文件中的常见语法错误
"""

import os
import re
import sys
from pathlib import Path

class WXMLValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        
    def validate_file(self, file_path):
        """验证单个WXML文件"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='strict') as f:
                content = f.read()
        except Exception as e:
            self.errors.append(f"{file_path}: 无法读取文件 - {e}")
            return
            
        lines = content.split('\n')
        
        # 检查常见语法错误
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # 检查未闭合的标签
            self.check_unclosed_tags(file_path, i, line, line_stripped)
            
            # 检查属性引号
            self.check_attribute_quotes(file_path, i, line, line_stripped)
            
            # 检查wx:if/wx:elif/wx:else语法
            self.check_wx_conditionals(file_path, i, line, line_stripped)
            
            # 检查wx:for语法
            self.check_wx_for(file_path, i, line, line_stripped)
            
            # 检查事件绑定
            self.check_event_bindings(file_path, i, line, line_stripped)
            
            # 检查未转义的特殊字符
            self.check_special_chars(file_path, i, line, line_stripped)
            
            # 检查注释语法
            self.check_comments(file_path, i, line, line_stripped)
    
    def check_unclosed_tags(self, file_path, line_num, line, stripped):
        """检查未闭合的标签"""
        # 简单的标签匹配检查
        open_tags = re.findall(r'<(view|text|button|image|input|form|canvas|movable-area|movable-view|block|swiper|swiper-item|scroll-view|rich-text|progress|slider|switch|radio|radio-group|checkbox|checkbox-group|picker|picker-view|picker-view-column|navigator|audio|video|camera|live-player|live-pusher|map|cover-view|cover-image|open-data|web-view|ad|official-account)(?!\w)', stripped)
        close_tags = re.findall(r'</(view|text|button|image|input|form|canvas|movable-area|movable-view|block|swiper|swiper-item|scroll-view|rich-text|progress|slider|switch|radio|radio-group|checkbox|checkbox-group|picker|picker-view|picker-view-column|navigator|audio|video|camera|live-player|live-pusher|map|cover-view|cover-image|open-data|web-view|ad|official-account)>', stripped)
        
        # 自关闭标签
        self_closing = re.findall(r'<(input|image|br|hr)(\s[^>]*)?/>', stripped)
        
        if len(open_tags) > len(close_tags) + len(self_closing):
            self.warnings.append(f"{file_path}:{line_num}: 可能存在未闭合的标签 - {stripped[:80]}")
    
    def check_attribute_quotes(self, file_path, line_num, line, stripped):
        """检查属性引号"""
        # 检查属性值是否使用引号
        bad_attrs = re.findall(r'\w+=[^"\']\S+', stripped)
        for attr in bad_attrs:
            if not attr.startswith('wx:') and not attr.startswith('bind'):
                continue
            if '=' in attr:
                value = attr.split('=')[1]
                if not (value.startswith('"') or value.startswith("'") or value.startswith('{{')):
                    self.errors.append(f"{file_path}:{line_num}: 属性值应该使用引号 - {attr}")
    
    def check_wx_conditionals(self, file_path, line_num, line, stripped):
        """检查wx:if等条件语法"""
        # 检查wx:if语法
        if 'wx:if=' in stripped:
            wxif_match = re.search(r'wx:if="([^"]*)"', stripped)
            if wxif_match:
                expr = wxif_match.group(1)
                if not (expr.startswith('{{') and expr.endswith('}}')):
                    self.errors.append(f"{file_path}:{line_num}: wx:if表达式应该使用双大括号 - {expr}")
        
        # 检查wx:elif语法
        if 'wx:elif=' in stripped:
            wxelif_match = re.search(r'wx:elif="([^"]*)"', stripped)
            if wxelif_match:
                expr = wxelif_match.group(1)
                if not (expr.startswith('{{') and expr.endswith('}}')):
                    self.errors.append(f"{file_path}:{line_num}: wx:elif表达式应该使用双大括号 - {expr}")
        
        # 检查wx:else位置
        if 'wx:else' in stripped:
            if not stripped.startswith('</'):
                self.warnings.append(f"{file_path}:{line_num}: wx:else通常应该紧跟在标签闭合后")
    
    def check_wx_for(self, file_path, line_num, line, stripped):
        """检查wx:for语法"""
        if 'wx:for=' in stripped:
            wxfor_match = re.search(r'wx:for="([^"]*)"', stripped)
            if wxfor_match:
                expr = wxfor_match.group(1)
                if not (expr.startswith('{{') and expr.endswith('}}')):
                    self.errors.append(f"{file_path}:{line_num}: wx:for表达式应该使用双大括号 - {expr}")
            
            # 检查是否包含wx:key
            if 'wx:key=' not in stripped:
                self.warnings.append(f"{file_path}:{line_num}: wx:for建议同时使用wx:key属性")
    
    def check_event_bindings(self, file_path, line_num, line, stripped):
        """检查事件绑定"""
        # 检查bindtap等事件绑定
        event_bindings = re.findall(r'(bind|catch|capture-bind|capture-catch):\w+="([^"]*)"', stripped)
        for event_type, handler in event_bindings:
            if not handler.startswith('{{') and not handler.endswith('}}'):
                # 允许直接的函数名
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', handler):
                    self.errors.append(f"{file_path}:{line_num}: 事件处理函数名无效 - {handler}")
    
    def check_special_chars(self, file_path, line_num, line, stripped):
        """检查特殊字符"""
        # 检查未转义的&符号
        if '&' in stripped and not re.search(r'&[a-zA-Z]+;', stripped):
            # 忽略注释中的&
            if not stripped.startswith('<!--'):
                self.warnings.append(f"{file_path}:{line_num}: 可能存在未转义的&符号")
        
        # 检查未转义的<和>符号
        if not stripped.startswith('<') and not stripped.endswith('>'):
            if re.search(r'[^<]<[^>]', stripped):
                self.warnings.append(f"{file_path}:{line_num}: 文本中可能存在未转义的<符号")
    
    def check_comments(self, file_path, line_num, line, stripped):
        """检查注释语法"""
        # 检查注释格式
        if '<!--' in stripped or '-->' in stripped:
            if not re.match(r'^\s*<!--.*-->\s*$', stripped):
                # 跨行注释检查
                if '<!--' in stripped and '-->' not in stripped:
                    self.warnings.append(f"{file_path}:{line_num}: 注释开始但未结束")
                elif '-->' in stripped and '<!--' not in stripped:
                    self.warnings.append(f"{file_path}:{line_num}: 注释结束但未开始")
    
    def validate_all(self, directory='.'):
        """验证目录下所有WXML文件"""
        wxml_files = []
        
        for root, dirs, files in os.walk(directory):
            # 跳过.git等隐藏目录
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.endswith('.wxml'):
                    wxml_files.append(os.path.join(root, file))
        
        print(f"找到 {len(wxml_files)} 个WXML文件")
        
        for wxml_file in wxml_files:
            print(f"\n检查: {wxml_file}")
            self.validate_file(wxml_file)
        
        # 输出结果
        print(f"\n{'='*60}")
        print(f"检查结果汇总:")
        print(f"错误: {len(self.errors)}")
        print(f"警告: {len(self.warnings)}")
        
        if self.errors:
            print(f"\n错误详情:")
            for error in self.errors:
                print(f"  ❌ {error}")
        
        if self.warnings:
            print(f"\n警告详情:")
            for warning in self.warnings:
                print(f"  ⚠️  {warning}")
        
        return len(self.errors) == 0

def main():
    validator = WXMLValidator()
    success = validator.validate_all('.')
    
    if not success:
        sys.exit(1)

if __name__ == '__main__':
    main()