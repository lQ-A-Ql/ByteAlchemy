#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SM4/SMS4 算法纯Python实现
标准: GB/T 32907-2016
支持模式: ECB, CBC, CFB, OFB, CTR
支持自定义S盒 (Magic S-Box)
"""

import struct
import base64
import os
import hashlib


class SM4Encoders:
    """SM4加密算法实现"""
    
    # 标准 S盒 (GB/T 32907-2016)
    STANDARD_SBOX = [
        0xd6, 0x90, 0xe9, 0xfe, 0xcc, 0xe1, 0x3d, 0xb7, 0x16, 0xb6, 0x14, 0xc2, 0x28, 0xfb, 0x2c, 0x05,
        0x2b, 0x67, 0x9a, 0x76, 0x2a, 0xbe, 0x04, 0xc3, 0xaa, 0x44, 0x13, 0x26, 0x49, 0x86, 0x06, 0x99,
        0x9c, 0x42, 0x50, 0xf4, 0x91, 0xef, 0x98, 0x7a, 0x33, 0x54, 0x0b, 0x43, 0xed, 0xcf, 0xac, 0x62,
        0xe4, 0xb3, 0x1c, 0xa9, 0xc9, 0x08, 0xe8, 0x95, 0x80, 0xdf, 0x94, 0xfa, 0x75, 0x8f, 0x3f, 0xa6,
        0x47, 0x07, 0xa7, 0xfc, 0xf3, 0x73, 0x17, 0xba, 0x83, 0x59, 0x3c, 0x19, 0xe6, 0x85, 0x4f, 0xa8,
        0x68, 0x6b, 0x81, 0xb2, 0x71, 0x64, 0xda, 0x8b, 0xf8, 0xeb, 0x0f, 0x4b, 0x70, 0x56, 0x9d, 0x35,
        0x1e, 0x24, 0x0e, 0x5e, 0x63, 0x58, 0xd1, 0xa2, 0x25, 0x22, 0x7c, 0x3b, 0x01, 0x21, 0x78, 0x87,
        0xd4, 0x00, 0x46, 0x57, 0x9f, 0xd3, 0x27, 0x52, 0x4c, 0x36, 0x02, 0xe7, 0xa0, 0xc4, 0xc8, 0x9e,
        0xea, 0xbf, 0x8a, 0xd2, 0x40, 0xc7, 0x38, 0xb5, 0xa3, 0xf7, 0xf2, 0xce, 0xf9, 0x61, 0x15, 0xa1,
        0xe0, 0xae, 0x5d, 0xa4, 0x9b, 0x34, 0x1a, 0x55, 0xad, 0x93, 0x32, 0x30, 0xf5, 0x8c, 0xb1, 0xe3,
        0x1d, 0xf6, 0xe2, 0x2e, 0x82, 0x66, 0xca, 0x60, 0xc0, 0x29, 0x23, 0xab, 0x0d, 0x53, 0x4e, 0x6f,
        0xd5, 0xdb, 0x37, 0x45, 0xde, 0xfd, 0x8e, 0x2f, 0x03, 0xff, 0x6a, 0x72, 0x6d, 0x6c, 0x5b, 0x51,
        0x8d, 0x1b, 0xaf, 0x92, 0xbb, 0xdd, 0xbc, 0x7f, 0x11, 0xd9, 0x5c, 0x41, 0x1f, 0x10, 0x5a, 0xd8,
        0x0a, 0xc1, 0x31, 0x88, 0xa5, 0xcd, 0x7b, 0xbd, 0x2d, 0x74, 0xd0, 0x12, 0xb8, 0xe5, 0xb4, 0xb0,
        0x89, 0x69, 0x97, 0x4a, 0x0c, 0x96, 0x77, 0x7e, 0x65, 0xb9, 0xf1, 0x09, 0xc5, 0x6e, 0xc6, 0x84,
        0x18, 0xf0, 0x7d, 0xec, 0x3a, 0xdc, 0x4d, 0x20, 0x79, 0xee, 0x5f, 0x3e, 0xd7, 0xcb, 0x39, 0x48
    ]

    # 系统参数 FK
    SM4_FK = [0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc]

    # 固定参数 CK
    SM4_CK = [
        0x00070e15, 0x1c232a31, 0x383f464d, 0x545b6269,
        0x70777e85, 0x8c939aa1, 0xa8afb6bd, 0xc4cbd2d9,
        0xe0e7eef5, 0xfc030a11, 0x181f262d, 0x343b4249,
        0x50575e65, 0x6c737a81, 0x888f969d, 0xa4abb2b9,
        0xc0c7ced5, 0xdce3eaf1, 0xf8ff060d, 0x141b2229,
        0x30373e45, 0x4c535a61, 0x686f767d, 0x848b9299,
        0xa0a7aeb5, 0xbcc3cad1, 0xd8dfe6ed, 0xf4fb0209,
        0x10171e25, 0x2c333a41, 0x484f565d, 0x646b7279
    ]

    def __init__(self, sbox=None):
        self.sk = [0] * 32
        self.swap_data_round = False  # 是否启用数据轮次交换字节序
        # 支持自定义S盒
        if sbox and len(sbox) == 256:
            self.sbox = sbox
        else:
            self.sbox = self.STANDARD_SBOX

    @staticmethod
    def _rotl(x, n):
        """循环左移"""
        return ((x << n) & 0xffffffff) | ((x >> (32 - n)) & 0xffffffff)

    def _tau(self, a):
        """非线性变换 - 使用实例S盒"""
        # Standard: result = S[B0]<<24 | S[B1]<<16 | S[B2]<<8 | S[B3]
        # (Where B0 is High Byte)
        # Using shift to extract:
        b0 = self.sbox[(a >> 24) & 0xff] 
        b1 = self.sbox[(a >> 16) & 0xff]
        b2 = self.sbox[(a >> 8) & 0xff]
        b3 = self.sbox[a & 0xff]
        return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3

    def _tau_swapped(self, a):
        """非线性变换 - 交换字节序 (Swapped Endianness)"""
        # Logic: S[B3]<<24 | S[B2]<<16 | S[B1]<<8 | S[B0]
        # (Where B3 is Low Byte of 'a')
        
        b0 = self.sbox[(a >> 24) & 0xff]
        b1 = self.sbox[(a >> 16) & 0xff]
        b2 = self.sbox[(a >> 8) & 0xff]
        b3 = self.sbox[a & 0xff]
        return (b3 << 24) | (b2 << 16) | (b1 << 8) | b0

    @staticmethod
    def _l_key(b):
        """密钥扩展线性变换"""
        return b ^ SM4Encoders._rotl(b, 13) ^ SM4Encoders._rotl(b, 23)

    @staticmethod
    def _l(b):
        """加密线性变换"""
        return b ^ SM4Encoders._rotl(b, 2) ^ SM4Encoders._rotl(b, 10) ^ SM4Encoders._rotl(b, 18) ^ SM4Encoders._rotl(b, 24)

    def set_key(self, key, mode=0, swap_key_schedule=False, swap_data_round=False):
        """设置密钥
        mode: 0=Encrypt, 1=Decrypt
        swap_key_schedule: use swapped S-box output for Key Expansion
        swap_data_round: use swapped S-box output for Encryption/Decryption rounds
        """
        self.swap_data_round = swap_data_round
        
        MK = [0, 0, 0, 0]
        try:
            k = struct.unpack('>4I', key)
            MK[0], MK[1], MK[2], MK[3] = k
        except:
             if len(key) < 16:
                 key = key + b'\x00' * (16 - len(key))
             elif len(key) > 16:
                 key = key[:16]
             k = struct.unpack('>4I', key)
             MK[0], MK[1], MK[2], MK[3] = k

        K = [0] * 36
        K[0] = MK[0] ^ self.SM4_FK[0]
        K[1] = MK[1] ^ self.SM4_FK[1]
        K[2] = MK[2] ^ self.SM4_FK[2]
        K[3] = MK[3] ^ self.SM4_FK[3]

        for i in range(32):
            rk = K[i+1] ^ K[i+2] ^ K[i+3] ^ self.SM4_CK[i]
            
            if swap_key_schedule:
                rk = self._tau_swapped(rk)
            else:
                rk = self._tau(rk)
                
            rk = self._l_key(rk)
            K[i+4] = K[i] ^ rk
            self.sk[i] = K[i+4]

        # 解密时密钥逆序
        if mode == 1:
            self.sk = self.sk[::-1]

    def one_round(self, block):
        """单轮加/解密"""
        X = [0, 0, 0, 0]
        X[0], X[1], X[2], X[3] = struct.unpack('>4I', block)

        for i in range(32):
            temp = X[1] ^ X[2] ^ X[3] ^ self.sk[i]
            
            # Apply tau (S-box)
            if self.swap_data_round:
                temp = self._tau_swapped(temp)
            else:
                temp = self._tau(temp)
                
            temp = self._l(temp)
            X[0] = X[0] ^ temp
            # 循环移位
            X[0], X[1], X[2], X[3] = X[1], X[2], X[3], X[0]

        return struct.pack('>4I', X[3], X[2], X[1], X[0])
    
    # ----------------------------
    # 辅助与填充
    # ----------------------------

    @staticmethod
    def _pad_data(data, padding, block_size=16):
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
        elif padding == 'iso10126':
            pad_len = block_size - len(data) % block_size
            return data + os.urandom(pad_len - 1) + bytes([pad_len])
        elif padding == 'ansix923':
            pad_len = block_size - len(data) % block_size
            return data + b'\x00' * (pad_len - 1) + bytes([pad_len])
        elif padding == 'nopadding':
            return data
        else:
             # Default to pkcs7
             pad_len = block_size - (len(data) % block_size)
             return data + bytes([pad_len] * pad_len)

    @staticmethod
    def _unpad_data(data, padding, block_size=16):
        """去除填充"""
        padding = padding.lower()
        if padding == 'pkcs7':
            pad_len = data[-1]
            if pad_len > block_size or pad_len < 1:
                raise ValueError("Invalid PKCS7 padding length")
            # Verify all padding bytes
            if data[-pad_len:] != bytes([pad_len] * pad_len):
                raise ValueError("Invalid PKCS7 padding bytes")
            return data[:-pad_len]
        elif padding == 'zeropadding':
            return data.rstrip(b'\x00')
        elif padding == 'iso10126' or padding == 'ansix923':
            pad_len = data[-1]
            if pad_len > block_size or pad_len < 1:
                raise ValueError("Invalid padding length")
            return data[:-pad_len]
        elif padding == 'nopadding':
            return data
        return data

    @staticmethod
    def _parse_sbox(sbox_str):
        """解析S盒"""
        if not sbox_str:
            return None
        if isinstance(sbox_str, list) and len(sbox_str) == 256:
            return sbox_str
        try:
            # 尝试解析为list
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
    def sm4_encrypt(data: str, key: str, mode: str = 'ECB', iv: str = '', padding: str = 'pkcs7', sbox=None,
                   key_type: str = 'utf-8', iv_type: str = 'utf-8', 
                   swap_key_schedule: bool = False, swap_data_round: bool = False,
                   swap_endian: bool = False, # Backward compatibility
                   data_type: str = None) -> str:
        """SM4加密"""
        if not data: return ""
        
        # Backward compatibility: swap_endian implies BOTH if others not specified?
        # Or if swap_endian is True, force both to True?
        if swap_endian:
            swap_key_schedule = True
            swap_data_round = True

        # ... Key Handling ...
        if key_type.lower() == 'hex':
            try:
                k_str = key.replace(' ', '')
                key_bytes = bytes.fromhex(k_str)
                if len(key_bytes) != 16: pass
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.md5(key.encode('utf-8')).digest()
        
        # Custom S-Box
        custom_sbox = SM4Encoders._parse_sbox(sbox)
        
        # IV
        mode = mode.upper()
        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
             if not iv:
                  iv_bytes = b'\x00' * 16
             else:
                  if iv_type.lower() == 'hex':
                      try:
                          i_str = iv.replace(' ', '')
                          iv_bytes = bytes.fromhex(i_str)
                          if len(iv_bytes) != 16:
                               raise ValueError("IV Hex长度必须为16字节")
                      except ValueError as e:
                          raise e
                      except:
                          raise ValueError("IV不是有效的Hex字符串")
                  else:
                      iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()
        else:
             iv_bytes = None
             
        sm4 = SM4Encoders(custom_sbox)
        sm4.set_key(key_bytes, 0, swap_key_schedule=swap_key_schedule, swap_data_round=swap_data_round) # 0 for encrypt
        
        # Data Handling
        if data_type and data_type.lower() == 'hex':
            try:
                d_str = data.replace(' ', '').replace('\n', '')
                data_bytes = bytes.fromhex(d_str)
            except:
                raise ValueError("输入数据不是有效的Hex字符串")
        else:
             data_bytes = data.encode('utf-8')
        
        # ... Padding & Loop Logic ...
        # Need to include padding Logic or reuse text?
        # I cannot see padding logic in view_file if I don't select it.
        # But wait, replace_file_content replaces chunk.
        # I must include enough context or just modify signature and set_key line.
        
        # ... Rest of sm4_encrypt logic is unchanged except set_key call ... 
        
        # Re-implementing the padding to loop start
        # Padding
        is_stream = mode in ['CFB', 'OFB', 'CTR']
        if is_stream:
             if padding.lower() == 'nopadding':
                 padded = data_bytes
             else:
                 padded = SM4Encoders._pad_data(data_bytes, padding)
        else:
             padded = SM4Encoders._pad_data(data_bytes, padding)
        
        encrypted = b''
        
        if mode == 'ECB':
             for i in range(0, len(padded), 16):
                  block = padded[i:i+16]
                  if len(block) < 16: break
                  encrypted += sm4.one_round(block)
                  
        elif mode == 'CBC':
             last_block = iv_bytes
             for i in range(0, len(padded), 16):
                  block = padded[i:i+16]
                  input_block = bytes([a ^ b for a, b in zip(block, last_block)])
                  output_block = sm4.one_round(input_block)
                  encrypted += output_block
                  last_block = output_block
                  
        elif mode == 'CTR':
             ctr = int.from_bytes(iv_bytes, byteorder='big')
             for i in range(0, len(padded), 16):
                  block = padded[i:i+16]
                  ctr_block = ctr.to_bytes(16, byteorder='big')
                  keystream = sm4.one_round(ctr_block)
                  chunk_len = len(block)
                  cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  encrypted += cipher_chunk
                  ctr += 1
                  
        elif mode == 'OFB':
             last_iv = iv_bytes
             for i in range(0, len(padded), 16):
                  block = padded[i:i+16]
                  keystream = sm4.one_round(last_iv)
                  chunk_len = len(block)
                  cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  encrypted += cipher_chunk
                  last_iv = keystream
                  
        elif mode == 'CFB':
             last_block = iv_bytes
             for i in range(0, len(padded), 16):
                  block = padded[i:i+16]
                  keystream = sm4.one_round(last_block)
                  chunk_len = len(block)
                  cipher_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  encrypted += cipher_chunk
                  if chunk_len == 16:
                      last_block = cipher_chunk
                  else:
                      pass 

        else:
             raise ValueError("Unsupported mode")

        if not iv and iv_bytes and mode != 'ECB':
             return base64.b64encode(iv_bytes + encrypted).decode('utf-8')
        return base64.b64encode(encrypted).decode('utf-8')

    @staticmethod
    def sm4_decrypt(data: str, key: str, mode: str = 'ECB', iv: str = '', padding: str = 'pkcs7', sbox=None,
                   key_type: str = 'utf-8', iv_type: str = 'utf-8', 
                   swap_key_schedule: bool = False, swap_data_round: bool = False,
                   swap_endian: bool = False,
                   data_type: str = None) -> str:
        """SM4解密"""
        if not data: return ""
        
        if swap_endian:
            swap_key_schedule = True
            swap_data_round = True
        
        if key_type.lower() == 'hex':
            try:
                k_str = key.replace(' ', '')
                key_bytes = bytes.fromhex(k_str)
            except:
                raise ValueError("密钥不是有效的Hex字符串")
        else:
            key_bytes = hashlib.md5(key.encode('utf-8')).digest()

        custom_sbox = SM4Encoders._parse_sbox(sbox)
        
        # DATA HANDLING
        try:
             if data_type and data_type.lower() == 'hex':
                 d_str = data.replace(' ', '').replace('\n', '')
                 encrypted_data = bytes.fromhex(d_str)
             elif data_type and data_type.lower() == 'base64':
                 encrypted_data = base64.b64decode(data)
             else:
                 encrypted_data = base64.b64decode(data)
        except Exception as e:
             if data_type: raise ValueError(f"输入数据解析失败 ({data_type}): {str(e)}")
             return ""

        mode = mode.upper()
        
        # ... IV Handling ...
        iv_bytes = None
        data_content = encrypted_data
        
        if mode in ['CBC', 'CFB', 'OFB', 'CTR']:
             if iv:
                  if iv_type.lower() == 'hex':
                      try:
                          i_str = iv.replace(' ', '')
                          iv_bytes = bytes.fromhex(i_str)
                          if len(iv_bytes) != 16:
                               raise ValueError("IV Hex长度必须为16字节")
                      except ValueError as e:
                          raise e
                      except:
                          raise ValueError("IV不是有效的Hex字符串")
                  else:
                      iv_bytes = hashlib.md5(iv.encode('utf-8')).digest()
             else:
                  if len(encrypted_data) < 16: return ""
                  iv_bytes = encrypted_data[:16]
                  data_content = encrypted_data[16:]
                  
        sm4 = SM4Encoders(custom_sbox)
        if mode in ['ECB', 'CBC']:
             sm4.set_key(key_bytes, 1, swap_key_schedule=swap_key_schedule, swap_data_round=swap_data_round) 
        else:
             sm4.set_key(key_bytes, 0, swap_key_schedule=swap_key_schedule, swap_data_round=swap_data_round)
        
        decrypted = b''
        
        if mode == 'ECB':
             for i in range(0, len(data_content), 16):
                  block = data_content[i:i+16]
                  decrypted += sm4.one_round(block)
                  
        elif mode == 'CBC':
             last_block = iv_bytes
             for i in range(0, len(data_content), 16):
                  block = data_content[i:i+16]
                  output_block = sm4.one_round(block)
                  plain_block = bytes([a ^ b for a, b in zip(output_block, last_block)])
                  decrypted += plain_block
                  last_block = block
                  
        elif mode == 'CTR':
             ctr = int.from_bytes(iv_bytes, byteorder='big')
             for i in range(0, len(data_content), 16):
                  block = data_content[i:i+16]
                  ctr_block = ctr.to_bytes(16, byteorder='big')
                  keystream = sm4.one_round(ctr_block)
                  chunk_len = len(block)
                  plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  decrypted += plain_chunk
                  ctr += 1
                  
        elif mode == 'OFB':
             last_iv = iv_bytes
             for i in range(0, len(data_content), 16):
                  block = data_content[i:i+16]
                  keystream = sm4.one_round(last_iv)
                  chunk_len = len(block)
                  plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  decrypted += plain_chunk
                  last_iv = keystream
                  
        elif mode == 'CFB':
             last_block = iv_bytes
             for i in range(0, len(data_content), 16):
                  block = data_content[i:i+16]
                  keystream = sm4.one_round(last_block)
                  chunk_len = len(block)
                  plain_chunk = bytes([a ^ b for a, b in zip(block, keystream[:chunk_len])])
                  decrypted += plain_chunk
                  if chunk_len == 16:
                      last_block = block # Ciphertext
                  
        is_stream = mode in ['CFB', 'OFB', 'CTR']
        
        final_bytes = decrypted
        if not is_stream:
             final_bytes = SM4Encoders._unpad_data(decrypted, padding)
             
        # Decode and Format Logic
        try:
             text_res = final_bytes.decode('utf-8')
             # Check for control characters (excluding standard whitespace)
             # If invisible chars exist, return repr() or Maybe Hex?
             # User previously requested repr for invisible chars.
             # But repr breaks the "Copy-Paste" round trip for Hex users.
             # Let's use repr ONLY if it WAS decoded successfully but has weird chars.
             import string
             printable = set(string.printable)
             has_weird = any(c not in printable and c not in ['\n', '\r', '\t'] for c in text_res)
             
             if '\x00' in text_res or has_weird:
                  return repr(text_res)
             
             return text_res
        except UnicodeDecodeError:
             # Fallback to Hex string for binary data
             # This allows the user to copy the output and use it as Hex input
             return final_bytes.hex()
        except:
             return final_bytes.hex()
