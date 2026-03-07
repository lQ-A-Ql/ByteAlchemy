#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML实体编码解码器实现
"""
class HtmlEncoders:
    @staticmethod
    def html_encode(data: str) -> str:
        try:
            result = data.replace('&', '&amp;')
            result = result.replace('<', '&lt;')
            result = result.replace('>', '&gt;')
            result = result.replace('"', '&quot;')
            result = result.replace("'", '&#39;')
            return result
        except Exception as e:
            raise ValueError(f"HTML实体编码失败: {str(e)}")

    @staticmethod
    def html_decode(data: str) -> str:
        try:
            # 先替换其他实体（避免先替换&amp;导致破坏其他实体）
            result = data.replace('&lt;', '<')
            result = result.replace('&gt;', '>')
            result = result.replace('&quot;', '"')
            result = result.replace('&#39;', "'")
            result = result.replace('&#x27;', "'")
            result = result.replace('&apos;', "'")
            # 最后替换 & 实体
            result = result.replace('&amp;', '&')
            return result
        except Exception as e:
            raise ValueError(f"HTML实体解码失败: {str(e)}")
