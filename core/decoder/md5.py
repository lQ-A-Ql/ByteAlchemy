#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MD5 哈希算法纯Python实现
支持自定义初始值、K常量、位移量 (Magic MD5)
"""

import struct
import base64
import math


class MD5Encoders:
    """MD5哈希算法实现 - 支持魔改参数"""
    
    # 标准初始哈希值
    STANDARD_INIT = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
    
    # 标准K常量表 (64个)
    STANDARD_K = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
        0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
        0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
        0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
        0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
        0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
        0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
        0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
        0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
        0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
        0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
        0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
        0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
        0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
        0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
    ]
    
    # 标准位移量
    STANDARD_SHIFTS = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ]
    
    def __init__(self, init_values=None, k_table=None, shifts=None):
        """初始化MD5，支持自定义参数"""
        self.init_values = init_values if init_values and len(init_values) == 4 else self.STANDARD_INIT
        self.k_table = k_table if k_table and len(k_table) == 64 else self.STANDARD_K
        self.shifts = shifts if shifts and len(shifts) == 64 else self.STANDARD_SHIFTS
    
    @staticmethod
    def _left_rotate(x, amount):
        """32位循环左移"""
        x = x & 0xffffffff
        return ((x << amount) | (x >> (32 - amount))) & 0xffffffff
    
    def _md5_hash(self, message):
        """计算MD5哈希"""
        # 初始化
        a0, b0, c0, d0 = self.init_values
        
        # 预处理：填充
        original_len = len(message)
        message += b'\x80'
        
        # 填充至 mod 512 = 448 bits (mod 64 = 56 bytes)
        while (len(message) % 64) != 56:
            message += b'\x00'
        
        # 添加原始长度 (64位小端)
        message += struct.pack('<Q', original_len * 8)
        
        # 处理每个512位 (64字节) 块
        for chunk_start in range(0, len(message), 64):
            chunk = message[chunk_start:chunk_start + 64]
            
            # 将块分为16个32位小端整数
            M = list(struct.unpack('<16I', chunk))
            
            # 初始化本块的哈希值
            A, B, C, D = a0, b0, c0, d0
            
            # 主循环
            for i in range(64):
                if i < 16:
                    F = (B & C) | ((~B) & D)
                    g = i
                elif i < 32:
                    F = (D & B) | ((~D) & C)
                    g = (5 * i + 1) % 16
                elif i < 48:
                    F = B ^ C ^ D
                    g = (3 * i + 5) % 16
                else:
                    F = C ^ (B | (~D))
                    g = (7 * i) % 16
                
                F = (F + A + self.k_table[i] + M[g]) & 0xffffffff
                A = D
                D = C
                C = B
                B = (B + self._left_rotate(F, self.shifts[i])) & 0xffffffff
            
            # 累加本块的哈希值
            a0 = (a0 + A) & 0xffffffff
            b0 = (b0 + B) & 0xffffffff
            c0 = (c0 + C) & 0xffffffff
            d0 = (d0 + D) & 0xffffffff
        
        # 输出 (小端序)
        return struct.pack('<4I', a0, b0, c0, d0)
    
    @staticmethod
    def _parse_init_values(init_str):
        """解析初始值"""
        if not init_str:
            return None
        if isinstance(init_str, list) and len(init_str) == 4:
            return init_str
        try:
            import json
            vals = json.loads(init_str)
            if isinstance(vals, list) and len(vals) == 4:
                return vals
        except:
            pass
        try:
            # 尝试解析 "0x67452301,0xefcdab89,..." 格式
            parts = init_str.replace(' ', '').split(',')
            if len(parts) == 4:
                return [int(p, 16) if p.startswith('0x') else int(p) for p in parts]
        except:
            pass
        return None
    
    @staticmethod
    def _parse_k_table(k_str):
        """解析K常量表"""
        if not k_str:
            return None
        if isinstance(k_str, list) and len(k_str) == 64:
            return k_str
        try:
            import json
            vals = json.loads(k_str)
            if isinstance(vals, list) and len(vals) == 64:
                return vals
        except:
            pass
        return None
    
    @staticmethod
    def _parse_shifts(shifts_str):
        """解析位移量"""
        if not shifts_str:
            return None
        if isinstance(shifts_str, list) and len(shifts_str) == 64:
            return shifts_str
        try:
            import json
            vals = json.loads(shifts_str)
            if isinstance(vals, list) and len(vals) == 64:
                return vals
        except:
            pass
        return None
    
    @staticmethod
    def md5_hash(data: str, output_format: str = 'hex',
                 init_values=None, k_table=None, shifts=None,
                 data_type: str = None,
                 salt: str = '', salt_position: str = 'suffix') -> str:
        """计算MD5哈希
        
        Args:
            data: 输入数据
            output_format: 输出格式 (hex/base64)
            init_values: 自定义初始值 [A, B, C, D]
            k_table: 自定义K常量表 (64个)
            shifts: 自定义位移量 (64个)
            data_type: 输入数据类型 (hex/utf-8)
            salt: 盐值 (UTF-8)
            salt_position: 盐位置 (prefix/suffix/both)
        """
        if not data:
            return ""
        
        # 解析自定义参数
        custom_init = MD5Encoders._parse_init_values(init_values)
        custom_k = MD5Encoders._parse_k_table(k_table)
        custom_shifts = MD5Encoders._parse_shifts(shifts)
        
        md5 = MD5Encoders(custom_init, custom_k, custom_shifts)
        
        # 数据处理
        if data_type and data_type.lower() == 'hex':
            try:
                data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
            except:
                raise ValueError("输入数据不是有效的Hex字符串")
        else:
            data_bytes = data.encode('utf-8')
        
        # Salt handling (UTF-8)
        if salt:
            salt_bytes = salt.encode('utf-8')
            pos = (salt_position or 'suffix').lower()
            if pos == 'prefix':
                data_bytes = salt_bytes + data_bytes
            elif pos == 'both':
                data_bytes = salt_bytes + data_bytes + salt_bytes
            else:
                data_bytes = data_bytes + salt_bytes

        # 计算哈希
        hash_bytes = md5._md5_hash(data_bytes)
        
        # 输出格式
        output_format = output_format.lower()
        if output_format == 'base64':
            return base64.b64encode(hash_bytes).decode('utf-8')
        else:
            return hash_bytes.hex()
