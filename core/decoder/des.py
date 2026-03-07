#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DES/3DES 算法纯Python实现
支持模式: ECB, CBC, CFB, OFB, CTR
支持自定义S盒 (Magic S-Box)
支持3DES (EDE模式)
"""

import struct
import base64
import os
import hashlib


def _format_binary_output(data: bytes, output_format: str = None) -> str:
    fmt = (output_format or '').lower()
    if fmt == 'hex':
        return data.hex()
    if fmt == 'base64':
        return base64.b64encode(data).decode('utf-8')
    if fmt == 'utf-8':
        return data.decode('utf-8', errors='replace')

    try:
        text_res = data.decode('utf-8')
        import unicodedata
        has_ctrl = any(
            unicodedata.category(c).startswith('C') and c not in '\n\r\t'
            for c in text_res
        )
        if has_ctrl:
            return data.hex()
        return text_res
    except UnicodeDecodeError:
        return data.hex()
    except Exception:
        return data.hex()


class DESEncoders:
    """DES加密算法实现"""
    
    # 标准 DES 8个 S盒 (每个4x16)
    STANDARD_SBOXES = [
        # S1
        [
            [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
            [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
            [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
            [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
        ],
        # S2
        [
            [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10],
            [3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5],
            [0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15],
            [13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
        ],
        # S3
        [
            [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8],
            [13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1],
            [13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7],
            [1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
        ],
        # S4
        [
            [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15],
            [13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9],
            [10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4],
            [3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
        ],
        # S5
        [
            [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
            [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
            [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
            [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
        ],
        # S6
        [
            [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11],
            [10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8],
            [9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6],
            [4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
        ],
        # S7
        [
            [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1],
            [13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6],
            [1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2],
            [6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
        ],
        # S8
        [
            [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7],
            [1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2],
            [7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8],
            [2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
        ],
    ]

    # 初始置换 IP
    IP = [
        58, 50, 42, 34, 26, 18, 10, 2,
        60, 52, 44, 36, 28, 20, 12, 4,
        62, 54, 46, 38, 30, 22, 14, 6,
        64, 56, 48, 40, 32, 24, 16, 8,
        57, 49, 41, 33, 25, 17, 9, 1,
        59, 51, 43, 35, 27, 19, 11, 3,
        61, 53, 45, 37, 29, 21, 13, 5,
        63, 55, 47, 39, 31, 23, 15, 7
    ]

    # 逆初始置换 IP^-1
    IP_INV = [
        40, 8, 48, 16, 56, 24, 64, 32,
        39, 7, 47, 15, 55, 23, 63, 31,
        38, 6, 46, 14, 54, 22, 62, 30,
        37, 5, 45, 13, 53, 21, 61, 29,
        36, 4, 44, 12, 52, 20, 60, 28,
        35, 3, 43, 11, 51, 19, 59, 27,
        34, 2, 42, 10, 50, 18, 58, 26,
        33, 1, 41, 9, 49, 17, 57, 25
    ]

    # 扩展置换 E
    E = [
        32, 1, 2, 3, 4, 5,
        4, 5, 6, 7, 8, 9,
        8, 9, 10, 11, 12, 13,
        12, 13, 14, 15, 16, 17,
        16, 17, 18, 19, 20, 21,
        20, 21, 22, 23, 24, 25,
        24, 25, 26, 27, 28, 29,
        28, 29, 30, 31, 32, 1
    ]

    # P置换
    P = [
        16, 7, 20, 21, 29, 12, 28, 17,
        1, 15, 23, 26, 5, 18, 31, 10,
        2, 8, 24, 14, 32, 27, 3, 9,
        19, 13, 30, 6, 22, 11, 4, 25
    ]

    # 密钥置换选择1 PC1
    PC1 = [
        57, 49, 41, 33, 25, 17, 9,
        1, 58, 50, 42, 34, 26, 18,
        10, 2, 59, 51, 43, 35, 27,
        19, 11, 3, 60, 52, 44, 36,
        63, 55, 47, 39, 31, 23, 15,
        7, 62, 54, 46, 38, 30, 22,
        14, 6, 61, 53, 45, 37, 29,
        21, 13, 5, 28, 20, 12, 4
    ]

    # 密钥置换选择2 PC2
    PC2 = [
        14, 17, 11, 24, 1, 5,
        3, 28, 15, 6, 21, 10,
        23, 19, 12, 4, 26, 8,
        16, 7, 27, 20, 13, 2,
        41, 52, 31, 37, 47, 55,
        30, 40, 51, 45, 33, 48,
        44, 49, 39, 56, 34, 53,
        46, 42, 50, 36, 29, 32
    ]

    # 每轮左移位数
    SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

    def __init__(self, sboxes=None):
        """初始化DES，可使用自定义S盒"""
        if sboxes and len(sboxes) == 8:
            self.sboxes = sboxes
        else:
            self.sboxes = self.STANDARD_SBOXES
        self.subkeys = []

    @staticmethod
    def _permute(block, table):
        """通用置换函数"""
        return [block[x - 1] for x in table]

    @staticmethod
    def _left_shift(bits, n):
        """循环左移"""
        return bits[n:] + bits[:n]

    def _generate_subkeys(self, key_bits):
        """生成16个子密钥"""
        # PC1置换
        key56 = self._permute(key_bits, self.PC1)
        c, d = key56[:28], key56[28:]

        self.subkeys = []
        for shift in self.SHIFTS:
            c = self._left_shift(c, shift)
            d = self._left_shift(d, shift)
            cd = c + d
            subkey = self._permute(cd, self.PC2)
            self.subkeys.append(subkey)

    def _sbox_substitution(self, bits48):
        """S盒替换"""
        output = []
        for i in range(8):
            block6 = bits48[i * 6:(i + 1) * 6]
            row = block6[0] * 2 + block6[5]
            col = block6[1] * 8 + block6[2] * 4 + block6[3] * 2 + block6[4]
            val = self.sboxes[i][row][col]
            output.extend([int(b) for b in format(val, '04b')])
        return output

    def _f_function(self, r_bits, subkey):
        """Feistel F函数"""
        # 扩展置换E
        expanded = self._permute(r_bits, self.E)
        # 与子密钥异或
        xored = [a ^ b for a, b in zip(expanded, subkey)]
        # S盒替换
        substituted = self._sbox_substitution(xored)
        # P置换
        return self._permute(substituted, self.P)

    def _des_block(self, block_bits, encrypt=True):
        """加密/解密单个64位块"""
        # 初始置换IP
        permuted = self._permute(block_bits, self.IP)
        l, r = permuted[:32], permuted[32:]

        # 16轮Feistel
        keys = self.subkeys if encrypt else self.subkeys[::-1]
        for subkey in keys:
            f_result = self._f_function(r, subkey)
            new_r = [a ^ b for a, b in zip(l, f_result)]
            l, r = r, new_r

        # 合并并逆初始置换
        combined = r + l  # 注意最后一轮不交换
        return self._permute(combined, self.IP_INV)

    @staticmethod
    def _bytes_to_bits(data):
        """字节转比特列表"""
        bits = []
        for byte in data:
            bits.extend([int(b) for b in format(byte, '08b')])
        return bits

    @staticmethod
    def _bits_to_bytes(bits):
        """比特列表转字节"""
        result = []
        for i in range(0, len(bits), 8):
            byte = 0
            for j, bit in enumerate(bits[i:i + 8]):
                byte = (byte << 1) | bit
            result.append(byte)
        return bytes(result)

    @staticmethod
    def _pad_data(data, padding, block_size=8):
        """填充数据"""
        padding = padding.lower()
        if padding == 'pkcs7':
            pad_len = block_size - (len(data) % block_size)
            return data + bytes([pad_len] * pad_len)
        elif padding == 'zeropadding':
            pad_len = block_size - len(data) % block_size
            if pad_len == block_size:
                return data
            return data + b'\x00' * pad_len
        elif padding == 'nopadding':
            return data
        else:
            pad_len = block_size - (len(data) % block_size)
            return data + bytes([pad_len] * pad_len)

    @staticmethod
    def _unpad_data(data, padding, block_size=8):
        """去除填充"""
        padding = padding.lower()
        if padding == 'pkcs7':
            pad_len = data[-1]
            if pad_len > block_size or pad_len < 1:
                raise ValueError("Invalid PKCS7 padding")
            return data[:-pad_len]
        elif padding == 'zeropadding':
            return data.rstrip(b'\x00')
        elif padding == 'nopadding':
            return data
        return data

    @staticmethod
    def _parse_sboxes(sbox_str):
        """解析自定义S盒"""
        if not sbox_str:
            return None
        if isinstance(sbox_str, list) and len(sbox_str) == 8:
            return sbox_str
        try:
            import json
            sboxes = json.loads(sbox_str)
            if isinstance(sboxes, list) and len(sboxes) == 8:
                return sboxes
        except:
            pass
        return None

    def encrypt_block(self, block, key):
        """加密单个8字节块"""
        key_bits = self._bytes_to_bits(key)
        self._generate_subkeys(key_bits)
        block_bits = self._bytes_to_bits(block)
        encrypted_bits = self._des_block(block_bits, encrypt=True)
        return self._bits_to_bytes(encrypted_bits)

    def decrypt_block(self, block, key):
        """解密单个8字节块"""
        key_bits = self._bytes_to_bits(key)
        self._generate_subkeys(key_bits)
        block_bits = self._bytes_to_bits(block)
        decrypted_bits = self._des_block(block_bits, encrypt=False)
        return self._bits_to_bytes(decrypted_bits)

    @staticmethod
    def des_encrypt(data: str, key: str, mode: str = 'ECB', iv: str = '',
                    padding: str = 'pkcs7', sboxes=None,
                    key_type: str = 'utf-8', iv_type: str = 'utf-8',
                    data_type: str = None) -> str:
        """DES加密"""
        if not data:
            return ""

        # 密钥处理
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.md5(key.encode('utf-8')).digest()[:8]

        if len(key_bytes) < 8:
            key_bytes = key_bytes + b'\x00' * (8 - len(key_bytes))
        elif len(key_bytes) > 8:
            key_bytes = key_bytes[:8]

        # 自定义S盒
        custom_sboxes = DESEncoders._parse_sboxes(sboxes)

        # IV处理
        mode = mode.upper()
        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
            if not iv:
                iv_bytes = b'\x00' * 8
            else:
                if iv_type.lower() == 'hex':
                    try:
                        iv_bytes = bytes.fromhex(iv.replace(' ', ''))
                        if len(iv_bytes) != 8:
                            raise ValueError("IV Hex长度必须为8字节")
                    except ValueError as e:
                        raise e
                else:
                    iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()[:8]
        else:
            iv_bytes = None

        des = DESEncoders(custom_sboxes)

        # 数据处理
        if data_type and data_type.lower() == 'hex':
            try:
                data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
            except:
                raise ValueError("输入数据不是有效的Hex字符串")
        else:
            data_bytes = data.encode('utf-8')

        # 填充
        is_stream = mode in ['CFB', 'OFB', 'CTR']
        if is_stream and padding.lower() == 'nopadding':
            padded = data_bytes
        else:
            padded = DESEncoders._pad_data(data_bytes, padding)

        encrypted = b''

        if mode == 'ECB':
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                if len(block) < 8:
                    break
                encrypted += des.encrypt_block(block, key_bytes)

        elif mode == 'CBC':
            last_block = iv_bytes
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                input_block = bytes([a ^ b for a, b in zip(block, last_block)])
                output_block = des.encrypt_block(input_block, key_bytes)
                encrypted += output_block
                last_block = output_block

        elif mode == 'CTR':
            ctr = int.from_bytes(iv_bytes, byteorder='big')
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                ctr_block = ctr.to_bytes(8, byteorder='big')
                keystream = des.encrypt_block(ctr_block, key_bytes)
                chunk_len = len(block)
                cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                encrypted += cipher_chunk
                ctr += 1

        elif mode == 'OFB':
            last_iv = iv_bytes
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                keystream = des.encrypt_block(last_iv, key_bytes)
                chunk_len = len(block)
                cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                encrypted += cipher_chunk
                last_iv = keystream

        elif mode == 'CFB':
            last_block = iv_bytes
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                keystream = des.encrypt_block(last_block, key_bytes)
                chunk_len = len(block)
                cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                encrypted += cipher_chunk
                if chunk_len == 8:
                    last_block = cipher_chunk

        else:
            raise ValueError("Unsupported mode")

        if not iv and iv_bytes and mode != 'ECB':
            return base64.b64encode(iv_bytes + encrypted).decode('utf-8')
        return base64.b64encode(encrypted).decode('utf-8')

    @staticmethod
    def des_decrypt(data: str, key: str, mode: str = 'ECB', iv: str = '',
                    padding: str = 'pkcs7', sboxes=None,
                    key_type: str = 'utf-8', iv_type: str = 'utf-8',
                    data_type: str = None, output_format: str = None) -> str:
        """DES解密"""
        if not data:
            return ""

        # 密钥处理
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.md5(key.encode('utf-8')).digest()[:8]

        if len(key_bytes) < 8:
            key_bytes = key_bytes + b'\x00' * (8 - len(key_bytes))
        elif len(key_bytes) > 8:
            key_bytes = key_bytes[:8]

        custom_sboxes = DESEncoders._parse_sboxes(sboxes)

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

        mode = mode.upper()

        # IV处理
        iv_bytes = None
        data_content = encrypted_data

        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
            if iv:
                if iv_type.lower() == 'hex':
                    try:
                        iv_bytes = bytes.fromhex(iv.replace(' ', ''))
                        if len(iv_bytes) != 8:
                            raise ValueError("IV Hex长度必须为8字节")
                    except ValueError as e:
                        raise e
                else:
                    iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()[:8]
            else:
                if len(encrypted_data) < 8:
                    return ""
                iv_bytes = encrypted_data[:8]
                data_content = encrypted_data[8:]

        des = DESEncoders(custom_sboxes)
        decrypted = b''

        if mode == 'ECB':
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                decrypted += des.decrypt_block(block, key_bytes)

        elif mode == 'CBC':
            last_block = iv_bytes
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                output_block = des.decrypt_block(block, key_bytes)
                plain_block = bytes([a ^ b for a, b in zip(output_block, last_block)])
                decrypted += plain_block
                last_block = block

        elif mode == 'CTR':
            ctr = int.from_bytes(iv_bytes, byteorder='big')
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                ctr_block = ctr.to_bytes(8, byteorder='big')
                keystream = des.encrypt_block(ctr_block, key_bytes)
                chunk_len = len(block)
                plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                decrypted += plain_chunk
                ctr += 1

        elif mode == 'OFB':
            last_iv = iv_bytes
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                keystream = des.encrypt_block(last_iv, key_bytes)
                chunk_len = len(block)
                plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                decrypted += plain_chunk
                last_iv = keystream

        elif mode == 'CFB':
            last_block = iv_bytes
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                keystream = des.encrypt_block(last_block, key_bytes)
                chunk_len = len(block)
                plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                decrypted += plain_chunk
                if chunk_len == 8:
                    last_block = block

        is_stream = mode in ['CFB', 'OFB', 'CTR']
        final_bytes = decrypted
        if not is_stream:
            final_bytes = DESEncoders._unpad_data(decrypted, padding)

        return _format_binary_output(final_bytes, output_format)

    @staticmethod
    def triple_des_encrypt(data: str, key: str, mode: str = 'ECB', iv: str = '',
                           padding: str = 'pkcs7', sboxes=None,
                           key_type: str = 'utf-8', iv_type: str = 'utf-8',
                           data_type: str = None) -> str:
        """3DES加密 (EDE模式)"""
        if not data:
            return ""

        # 密钥处理 - 3DES需要24字节密钥
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.sha256(key.encode('utf-8')).digest()[:24]

        if len(key_bytes) < 24:
            key_bytes = key_bytes + key_bytes[:24 - len(key_bytes)]
        elif len(key_bytes) > 24:
            key_bytes = key_bytes[:24]

        k1, k2, k3 = key_bytes[:8], key_bytes[8:16], key_bytes[16:24]

        custom_sboxes = DESEncoders._parse_sboxes(sboxes)

        # IV处理
        mode = mode.upper()
        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
            if not iv:
                iv_bytes = b'\x00' * 8
            else:
                if iv_type.lower() == 'hex':
                    try:
                        iv_bytes = bytes.fromhex(iv.replace(' ', ''))
                        if len(iv_bytes) != 8:
                            raise ValueError("IV Hex长度必须为8字节")
                    except ValueError as e:
                        raise e
                else:
                    iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()[:8]
        else:
            iv_bytes = None

        des = DESEncoders(custom_sboxes)

        # 数据处理
        if data_type and data_type.lower() == 'hex':
            try:
                data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
            except:
                raise ValueError("输入数据不是有效的Hex字符串")
        else:
            data_bytes = data.encode('utf-8')

        # 填充
        padded = DESEncoders._pad_data(data_bytes, padding)

        def ede_encrypt(block):
            """EDE: Encrypt-Decrypt-Encrypt"""
            step1 = des.encrypt_block(block, k1)
            step2 = des.decrypt_block(step1, k2)
            step3 = des.encrypt_block(step2, k3)
            return step3

        encrypted = b''

        if mode == 'ECB':
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                if len(block) < 8:
                    break
                encrypted += ede_encrypt(block)

        elif mode == 'CBC':
            last_block = iv_bytes
            for i in range(0, len(padded), 8):
                block = padded[i:i + 8]
                input_block = bytes([a ^ b for a, b in zip(block, last_block)])
                output_block = ede_encrypt(input_block)
                encrypted += output_block
                last_block = output_block

        else:
            raise ValueError(f"3DES暂不支持 {mode} 模式")

        if not iv and iv_bytes and mode != 'ECB':
            return base64.b64encode(iv_bytes + encrypted).decode('utf-8')
        return base64.b64encode(encrypted).decode('utf-8')

    @staticmethod
    def triple_des_decrypt(data: str, key: str, mode: str = 'ECB', iv: str = '',
                           padding: str = 'pkcs7', sboxes=None,
                           key_type: str = 'utf-8', iv_type: str = 'utf-8',
                           data_type: str = None, output_format: str = None) -> str:
        """3DES解密 (EDE模式)"""
        if not data:
            return ""

        # 密钥处理
        if key_type.lower() == 'hex':
            try:
                key_bytes = bytes.fromhex(key.replace(' ', ''))
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.sha256(key.encode('utf-8')).digest()[:24]

        if len(key_bytes) < 24:
            key_bytes = key_bytes + key_bytes[:24 - len(key_bytes)]
        elif len(key_bytes) > 24:
            key_bytes = key_bytes[:24]

        k1, k2, k3 = key_bytes[:8], key_bytes[8:16], key_bytes[16:24]

        custom_sboxes = DESEncoders._parse_sboxes(sboxes)

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

        mode = mode.upper()

        # IV处理
        iv_bytes = None
        data_content = encrypted_data

        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
            if iv:
                if iv_type.lower() == 'hex':
                    try:
                        iv_bytes = bytes.fromhex(iv.replace(' ', ''))
                        if len(iv_bytes) != 8:
                            raise ValueError("IV Hex长度必须为8字节")
                    except ValueError as e:
                        raise e
                else:
                    iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()[:8]
            else:
                if len(encrypted_data) < 8:
                    return ""
                iv_bytes = encrypted_data[:8]
                data_content = encrypted_data[8:]

        des = DESEncoders(custom_sboxes)

        def ede_decrypt(block):
            """EDE解密: Decrypt-Encrypt-Decrypt"""
            step1 = des.decrypt_block(block, k3)
            step2 = des.encrypt_block(step1, k2)
            step3 = des.decrypt_block(step2, k1)
            return step3

        decrypted = b''

        if mode == 'ECB':
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                decrypted += ede_decrypt(block)

        elif mode == 'CBC':
            last_block = iv_bytes
            for i in range(0, len(data_content), 8):
                block = data_content[i:i + 8]
                output_block = ede_decrypt(block)
                plain_block = bytes([a ^ b for a, b in zip(output_block, last_block)])
                decrypted += plain_block
                last_block = block

        else:
            raise ValueError(f"3DES暂不支持 {mode} 模式")

        final_bytes = DESEncoders._unpad_data(decrypted, padding)

        return _format_binary_output(final_bytes, output_format)
