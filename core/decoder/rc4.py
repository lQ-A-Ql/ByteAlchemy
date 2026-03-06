#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RC4 流密码算法纯Python实现
支持自定义S盒初始化和KSA/PRGA修改 (Magic RC4)
"""

import base64


class RC4Encoders:
    """RC4流密码实现 - 支持魔改参数"""
    
    def __init__(self, swap_bytes=False, custom_sbox=None):
        """初始化RC4
        
        Args:
            swap_bytes: KSA交换时是否交换字节顺序
            custom_sbox: 自定义初始S盒 (256字节)
        """
        self.swap_bytes = swap_bytes
        self.custom_sbox = custom_sbox
    
    def _ksa(self, key):
        """密钥调度算法 (Key Scheduling Algorithm)"""
        key_len = len(key)
        
        # 初始化S盒
        if self.custom_sbox and len(self.custom_sbox) == 256:
            S = list(self.custom_sbox)
        else:
            S = list(range(256))
        
        j = 0
        for i in range(256):
            j = (j + S[i] + key[i % key_len]) % 256
            
            if self.swap_bytes:
                # Magic: 交换时使用不同的逻辑
                S[i], S[j] = S[j] ^ i, S[i] ^ j
            else:
                # 标准交换
                S[i], S[j] = S[j], S[i]
        
        return S
    
    def _prga(self, S, length):
        """伪随机生成算法 (Pseudo-Random Generation Algorithm)"""
        i = 0
        j = 0
        keystream = []
        
        for _ in range(length):
            i = (i + 1) % 256
            j = (j + S[i]) % 256
            S[i], S[j] = S[j], S[i]
            
            K = S[(S[i] + S[j]) % 256]
            keystream.append(K)
        
        return keystream
    
    def encrypt(self, plaintext, key):
        """RC4加密"""
        S = self._ksa(key)
        keystream = self._prga(S, len(plaintext))
        return bytes([p ^ k for p, k in zip(plaintext, keystream)])
    
    def decrypt(self, ciphertext, key):
        """RC4解密 (与加密相同)"""
        return self.encrypt(ciphertext, key)
    
    @staticmethod
    def _parse_sbox(sbox_str):
        """解析自定义S盒"""
        if not sbox_str:
            return None
        if isinstance(sbox_str, list) and len(sbox_str) == 256:
            return sbox_str
        try:
            import json
            sbox = json.loads(sbox_str)
            if isinstance(sbox, list) and len(sbox) == 256:
                return sbox
        except:
            pass
        try:
            # 尝试Hex String
            import binascii
            sbox_str = sbox_str.replace(' ', '').replace('\n', '')
            sbox = list(binascii.unhexlify(sbox_str))
            if len(sbox) == 256:
                return sbox
        except:
            pass
        return None
    
    @staticmethod
    def rc4_encrypt(data: str, key: str, 
                    swap_bytes: bool = False, sbox=None,
                    key_type: str = 'utf-8',
                    data_type: str = None,
                    output_format: str = None) -> str:
        """RC4加密
        
        Args:
            data: 输入数据
            key: 密钥
            swap_bytes: KSA交换时是否使用魔改逻辑
            sbox: 自定义初始S盒
            key_type: 密钥类型 (hex/utf-8)
            data_type: 输入数据类型 (hex/utf-8)
            output_format: 输出格式 (hex/base64)，默认 base64
        """
        if not data:
            return ""
        
        # 密钥处理
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = key.encode('utf-8')
        
        if not key_bytes:
            raise ValueError("密钥不能为空")
        
        # 自定义S盒
        custom_sbox = RC4Encoders._parse_sbox(sbox)
        
        rc4 = RC4Encoders(swap_bytes=swap_bytes, custom_sbox=custom_sbox)
        
        # 数据处理
        if data_type and data_type.lower() == 'hex':
            try:
                data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
            except:
                raise ValueError("输入数据不是有效的Hex字符串")
        else:
            data_bytes = data.encode('utf-8')
        
        # 加密
        encrypted = rc4.encrypt(data_bytes, key_bytes)
        
        # 输出格式
        if output_format and output_format.lower() == 'hex':
            return encrypted.hex()
        
        return base64.b64encode(encrypted).decode('utf-8')
    
    @staticmethod
    def rc4_decrypt(data: str, key: str,
                    swap_bytes: bool = False, sbox=None,
                    key_type: str = 'utf-8',
                    data_type: str = None,
                    output_format: str = None) -> str:
        """RC4解密
        
        Args:
            data: Base64或Hex编码的密文
            key: 密钥
            swap_bytes: KSA交换时是否使用魔改逻辑
            sbox: 自定义初始S盒
            key_type: 密钥类型 (hex/utf-8)
            data_type: 输入数据类型 (hex/base64)
            output_format: 输出格式 (hex/utf-8)，默认自动检测
        """
        if not data:
            return ""
        
        # 密钥处理
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = key.encode('utf-8')
        
        if not key_bytes:
            raise ValueError("密钥不能为空")
        
        # 数据解析
        try:
            if data_type and data_type.lower() == 'hex':
                encrypted_data = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
            elif data_type and data_type.lower() == 'base64':
                encrypted_data = base64.b64decode(data)
            else:
                encrypted_data = base64.b64decode(data)
        except Exception as e:
            if data_type:
                raise ValueError(f"输入数据解析失败 ({data_type}): {str(e)}")
            return ""
        
        # 自定义S盒
        custom_sbox = RC4Encoders._parse_sbox(sbox)
        
        rc4 = RC4Encoders(swap_bytes=swap_bytes, custom_sbox=custom_sbox)
        
        # 解密
        decrypted = rc4.decrypt(encrypted_data, key_bytes)
        
        # 输出格式
        if output_format and output_format.lower() == 'hex':
            return decrypted.hex()
        if output_format and output_format.lower() == 'utf-8':
            # 显式要求 UTF-8：直接解码返回
            try:
                return decrypted.decode('utf-8')
            except UnicodeDecodeError:
                return decrypted.hex()
        
        # 默认行为：自动检测（支持非 ASCII Unicode）
        try:
            text_res = decrypted.decode('utf-8')
            import unicodedata
            has_ctrl = any(
                unicodedata.category(c).startswith('C') and c not in '\n\r\t'
                for c in text_res
            )
            if has_ctrl:
                return decrypted.hex()
            return text_res
        except UnicodeDecodeError:
            return decrypted.hex()
        except:
            return decrypted.hex()
