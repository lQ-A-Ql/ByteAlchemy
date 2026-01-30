# pipeline.py
"""
混合编码操作链接口，支持多步编码/解码。
"""
from typing import List, Callable, Dict, Any

class Operation:
    def __init__(self, name: str, func: Callable[[str, Dict[str, Any]], str], params: Dict[str, Any] = None):
        self.name = name
        self.func = func
        self.params = params or {}

    def apply(self, data: str) -> str:
        return self.func(data, self.params)

class Pipeline:
    def __init__(self):
        self.operations: List[Operation] = []

    def add_operation(self, operation: Operation):
        self.operations.append(operation)

    def remove_operation(self, index: int):
        if 0 <= index < len(self.operations):
            self.operations.pop(index)

    def move_operation(self, old_index: int, new_index: int):
        if 0 <= old_index < len(self.operations) and 0 <= new_index < len(self.operations):
            op = self.operations.pop(old_index)
            self.operations.insert(new_index, op)

    def run(self, data: str) -> str:
        for op in self.operations:
            data = op.apply(data)
        return data

# 注册所有可用操作
OPERATION_REGISTRY: Dict[str, Callable[[str, Dict[str, Any]], str]] = {}

def register_operation(name: str):
    def decorator(func):
        OPERATION_REGISTRY[name] = func
        return func
    return decorator


# === 注册 core 下所有编码/解码操作 ===
from core.decoder.base import BaseEncoders
from core.decoder.html import HtmlEncoders
from core.decoder.unicode import UnicodeEncoders
from core.decoder.url import UrlEncoders

# Base家族
@register_operation('base16_encode')
def base16_encode(data, params):
    return BaseEncoders.base16_encode(data)

@register_operation('base16_decode')
def base16_decode(data, params):
    return BaseEncoders.base16_decode(data)

@register_operation('base32_encode')
def base32_encode(data, params):
    return BaseEncoders.base32_encode(data)

@register_operation('base32_decode')
def base32_decode(data, params):
    return BaseEncoders.base32_decode(data)

@register_operation('base64_encode')
def base64_encode(data, params):
    return BaseEncoders.base64_encode(data)

@register_operation('base64_decode')
def base64_decode(data, params):
    return BaseEncoders.base64_decode(data)

@register_operation('base85_encode')
def base85_encode(data, params):
    return BaseEncoders.base85_encode(data)

@register_operation('base85_decode')
def base85_decode(data, params):
    return BaseEncoders.base85_decode(data)

# HTML实体
@register_operation('html_encode')
def html_encode(data, params):
    return HtmlEncoders.html_encode(data)

@register_operation('html_decode')
def html_decode(data, params):
    return HtmlEncoders.html_decode(data)

# Unicode转义
@register_operation('unicode_encode')
def unicode_encode(data, params):
    return UnicodeEncoders.unicode_encode(data)

@register_operation('unicode_decode')
def unicode_decode(data, params):
    return UnicodeEncoders.unicode_decode(data)

# URL编码
@register_operation('url_encode')
def url_encode(data, params):
    return UrlEncoders.url_encode(data)

@register_operation('url_decode')
def url_decode(data, params):
    return UrlEncoders.url_decode(data)

# AES加解密
from core.decoder.aes_pure import AesPureEncoders

@register_operation('aes_encrypt')
def aes_encrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'CBC')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    val_swap_key = params.get('swap_key_schedule', False)
    val_swap_data = params.get('swap_data_round', False)

    return AesPureEncoders.encrypt(data, key, mode, iv, padding, sbox=sbox, 
                                   swap_key_schedule=val_swap_key, swap_data_round=val_swap_data,
                                   key_type=val_key_type, iv_type=val_iv_type, data_type=val_data_type)

@register_operation('aes_decrypt')
def aes_decrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'CBC')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    val_swap_key = params.get('swap_key_schedule', False)
    val_swap_data = params.get('swap_data_round', False)
    
    return AesPureEncoders.decrypt(data, key, mode, iv, padding, sbox=sbox,
                                   swap_key_schedule=val_swap_key, swap_data_round=val_swap_data,
                                   key_type=val_key_type, iv_type=val_iv_type, data_type=val_data_type)


# SM4加解密
from core.decoder.sm4 import SM4Encoders

@register_operation('sm4_encrypt')
def sm4_encrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_swap_endian = params.get('swap_endian', False)
    val_swap_key = params.get('swap_key_schedule', False)
    val_swap_data = params.get('swap_data_round', False)
    val_data_type = params.get('data_type')
    
    return SM4Encoders.sm4_encrypt(data, key, mode, iv, padding, sbox=sbox,
                                 key_type=val_key_type, iv_type=val_iv_type, 
                                 swap_endian=val_swap_endian, 
                                 swap_key_schedule=val_swap_key,
                                 swap_data_round=val_swap_data,
                                 data_type=val_data_type)

@register_operation('sm4_decrypt')
def sm4_decrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_swap_endian = params.get('swap_endian', False)
    val_swap_key = params.get('swap_key_schedule', False)
    val_swap_data = params.get('swap_data_round', False)
    val_data_type = params.get('data_type')
    
    return SM4Encoders.sm4_decrypt(data, key, mode, iv, padding, sbox=sbox,
                                 key_type=val_key_type, iv_type=val_iv_type, 
                                 swap_endian=val_swap_endian, 
                                 swap_key_schedule=val_swap_key,
                                 swap_data_round=val_swap_data,
                                 data_type=val_data_type)

# GUI 可通过 OPERATION_REGISTRY.keys() 获取所有操作名
# 并通过 Pipeline 组合操作链

# DES/3DES加解密
from core.decoder.des import DESEncoders

@register_operation('des_encrypt')
def des_encrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sboxes = params.get('sboxes')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return DESEncoders.des_encrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                   key_type=val_key_type, iv_type=val_iv_type,
                                   data_type=val_data_type)

@register_operation('des_decrypt')
def des_decrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sboxes = params.get('sboxes')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return DESEncoders.des_decrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                   key_type=val_key_type, iv_type=val_iv_type,
                                   data_type=val_data_type)

@register_operation('triple_des_encrypt')
def triple_des_encrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sboxes = params.get('sboxes')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return DESEncoders.triple_des_encrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                          key_type=val_key_type, iv_type=val_iv_type,
                                          data_type=val_data_type)

@register_operation('triple_des_decrypt')
def triple_des_decrypt(data, params):
    key = params.get('key', '')
    mode = params.get('mode', 'ECB')
    iv = params.get('iv', '')
    padding = params.get('padding', 'pkcs7')
    sboxes = params.get('sboxes')
    val_key_type = params.get('key_type', 'utf-8')
    val_iv_type = params.get('iv_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return DESEncoders.triple_des_decrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                          key_type=val_key_type, iv_type=val_iv_type,
                                          data_type=val_data_type)

# MD5哈希
from core.decoder.md5 import MD5Encoders

@register_operation('md5_hash')
def md5_hash(data, params):
    output_format = params.get('output_format', 'hex')
    init_values = params.get('init_values')
    k_table = params.get('k_table')
    shifts = params.get('shifts')
    val_data_type = params.get('data_type')
    
    return MD5Encoders.md5_hash(data, output_format=output_format,
                                init_values=init_values, k_table=k_table,
                                shifts=shifts, data_type=val_data_type)

# RC4流密码
from core.decoder.rc4 import RC4Encoders

@register_operation('rc4_encrypt')
def rc4_encrypt(data, params):
    key = params.get('key', '')
    swap_bytes = params.get('swap_bytes', False)
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return RC4Encoders.rc4_encrypt(data, key, swap_bytes=swap_bytes, sbox=sbox,
                                   key_type=val_key_type, data_type=val_data_type)

@register_operation('rc4_decrypt')
def rc4_decrypt(data, params):
    key = params.get('key', '')
    swap_bytes = params.get('swap_bytes', False)
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_data_type = params.get('data_type')
    
    return RC4Encoders.rc4_decrypt(data, key, swap_bytes=swap_bytes, sbox=sbox,
                                   key_type=val_key_type, data_type=val_data_type)
