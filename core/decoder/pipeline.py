# pipeline.py
"""
混合编码操作链接口，支持多步编码/解码。
内部全程使用 bytes 传递数据，确保编码链中二进制数据不会被文本转换破坏。
"""
from typing import List, Callable, Dict, Any, Union
import base64
import hashlib


def _normalize_format(fmt: str, default: str = 'utf-8') -> str:
    value = (fmt or default).strip().lower()
    aliases = {
        'utf8': 'utf-8',
        'text': 'utf-8',
        'auto': 'auto',
        'hex': 'hex',
        'ascii': 'ascii',
        'base64': 'base64',
    }
    return aliases.get(value, value or default)


def _clean_hex_input(data: str) -> str:
    return data.replace('0x', '').replace('0X', '').replace('\\x', '').replace('\\X', '').replace(' ', '').replace('\n', '').replace('\r', '')


def _auto_format_bytes(data: bytes) -> str:
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

class Operation:
    def __init__(self, name: str, func: Callable[[str, Dict[str, Any]], str], params: Dict[str, Any] = None):
        self.name = name
        self.func = func
        self.params = params or {}

    def apply(self, data: str, params: Dict[str, Any] = None) -> str:
        return self.func(data, params if params is not None else self.params)

class Pipeline:
    def __init__(self, input_format='hex', output_format='utf-8'):
        self.operations: List[Operation] = []
        self.input_format = _normalize_format(input_format, 'hex')
        self.output_format = _normalize_format(output_format, 'utf-8')

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
        """执行操作链，内部统一使用 bytes 传递。"""
        if not self.operations:
            return data

        current = self._parse_input_bytes(data, self.input_format)

        for index, op in enumerate(self.operations, start=1):
            current = self._apply_operation(op, current, index)

        return self._format_output(current, self.output_format)

    @staticmethod
    def _parse_input_bytes(data: str, fmt: str) -> bytes:
        fmt = _normalize_format(fmt, 'utf-8')
        if fmt == 'hex':
            cleaned = _clean_hex_input(data)
            if not cleaned:
                return b''
            try:
                return bytes.fromhex(cleaned)
            except ValueError as exc:
                raise ValueError('输入数据不是有效的Hex字符串') from exc
        if fmt == 'base64':
            return base64.b64decode(data)
        if fmt == 'ascii':
            return data.encode('ascii', errors='replace')
        return data.encode('utf-8')

    @staticmethod
    def _format_output(data: bytes, fmt: str) -> str:
        fmt = _normalize_format(fmt, 'utf-8')
        if fmt == 'hex':
            return data.hex()
        if fmt == 'base64':
            return base64.b64encode(data).decode('utf-8')
        if fmt == 'ascii':
            return data.decode('ascii', errors='replace')
        if fmt == 'utf-8':
            return data.decode('utf-8', errors='replace')
        return _auto_format_bytes(data)

    @staticmethod
    def _decode_text_bytes(data: bytes, op_name: str, step: int) -> str:
        try:
            return data.decode('utf-8')
        except UnicodeDecodeError as exc:
            raise ValueError(
                f"第 {step} 步 `{op_name}` 需要 UTF-8 文本输入，但上一链路输出为二进制数据。"
                "请先插入 Base64/HEX 编码步骤，或调整操作顺序。"
            ) from exc

    def _apply_operation(self, op: Operation, current: bytes, step: int) -> bytes:
        params = dict(op.params or {})

        if op.name == 'known_plaintext_helper':
            return current

        if op.name in TEXT_OPERATIONS:
            text_input = self._decode_text_bytes(current, op.name, step)
            result = op.apply(text_input, params)
            return str(result).encode('utf-8')

        if op.name in BASE_ENCODE_OPERATIONS:
            result = self._run_base_encode(op.name, current, params)
            return result.encode('utf-8')

        if op.name in BASE_DECODE_OPERATIONS:
            text_input = self._decode_text_bytes(current, op.name, step)
            return self._run_base_decode(op.name, text_input, params)

        if op.name in HASH_OPERATIONS:
            params['data_type'] = 'hex'
            result = op.apply(current.hex(), params)
            return str(result).encode('utf-8')

        if op.name in HEX_OUTPUT_BINARY_OPERATIONS:
            params['data_type'] = 'hex'
            params['output_format'] = 'hex'
            result = op.apply(current.hex(), params)
            try:
                return bytes.fromhex(str(result).replace(' ', '').replace('\n', '').replace('\r', ''))
            except ValueError as exc:
                raise ValueError(f"操作 `{op.name}` 没有返回有效的Hex结果") from exc

        if op.name in BASE64_OUTPUT_BINARY_OPERATIONS:
            params['data_type'] = 'hex'
            result = op.apply(current.hex(), params)
            try:
                return base64.b64decode(result)
            except Exception as exc:
                raise ValueError(f"操作 `{op.name}` 没有返回有效的Base64结果") from exc

        text_input = self._decode_text_bytes(current, op.name, step)
        result = op.apply(text_input, params)
        return str(result).encode('utf-8')

    @staticmethod
    def _run_base_encode(name: str, data: bytes, params: Dict[str, Any]) -> str:
        if name == 'base16_encode':
            return BaseEncoders.base16_encode(data)
        if name == 'base32_encode':
            return BaseEncoders.base32_encode(data)
        if name == 'base64_encode':
            return BaseEncoders.base64_encode(data, url_safe=params.get('url_safe', False))
        if name == 'base85_encode':
            return BaseEncoders.base85_encode(data, variant=params.get('variant', 'ascii85'))
        raise ValueError(f'Unsupported base encode operation: {name}')

    @staticmethod
    def _run_base_decode(name: str, data: str, params: Dict[str, Any]) -> bytes:
        if name == 'base16_decode':
            return BaseEncoders.base16_decode_to_bytes(data)
        if name == 'base32_decode':
            return BaseEncoders.base32_decode_to_bytes(data)
        if name == 'base64_decode':
            return BaseEncoders.base64_decode_to_bytes(data, url_safe=params.get('url_safe', False))
        if name == 'base85_decode':
            return BaseEncoders.base85_decode_to_bytes(data, variant=params.get('variant', 'ascii85'))
        raise ValueError(f'Unsupported base decode operation: {name}')

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

TEXT_OPERATIONS = {
    'html_encode', 'html_decode',
    'unicode_encode', 'unicode_decode',
    'url_encode', 'url_decode',
}

BASE_ENCODE_OPERATIONS = {
    'base16_encode', 'base32_encode', 'base64_encode', 'base85_encode',
}

BASE_DECODE_OPERATIONS = {
    'base16_decode', 'base32_decode', 'base64_decode', 'base85_decode',
}

HASH_OPERATIONS = {
    'md5_hash', 'sha1_hash', 'sha256_hash', 'sha512_hash',
}

HEX_OUTPUT_BINARY_OPERATIONS = {
    'xor_bytes',
    'rc4_encrypt', 'rc4_decrypt',
    'aes_decrypt', 'sm4_decrypt',
    'des_decrypt', 'triple_des_decrypt',
    'blowfish_decrypt', 'cast_decrypt', 'arc2_decrypt',
    'chacha20_decrypt', 'salsa20_decrypt',
}

BASE64_OUTPUT_BINARY_OPERATIONS = {
    'aes_encrypt', 'sm4_encrypt',
    'des_encrypt', 'triple_des_encrypt',
    'blowfish_encrypt', 'cast_encrypt', 'arc2_encrypt',
    'chacha20_encrypt', 'salsa20_encrypt',
}

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
    val_output_format = params.get('output_format')
    
    return AesPureEncoders.decrypt(data, key, mode, iv, padding, sbox=sbox,
                                   swap_key_schedule=val_swap_key, swap_data_round=val_swap_data,
                                   key_type=val_key_type, iv_type=val_iv_type,
                                   data_type=val_data_type, output_format=val_output_format)


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
    val_output_format = params.get('output_format')
    
    return SM4Encoders.sm4_decrypt(data, key, mode, iv, padding, sbox=sbox,
                                 key_type=val_key_type, iv_type=val_iv_type, 
                                 swap_endian=val_swap_endian, 
                                 swap_key_schedule=val_swap_key,
                                 swap_data_round=val_swap_data,
                                 data_type=val_data_type,
                                 output_format=val_output_format)

# GUI 可通过 OPERATION_REGISTRY.keys() 获取所有操作名
# 并通过 Pipeline 组合操作链

# XOR (magic) helper
@register_operation('xor_bytes')
def xor_bytes(data, params):
    if data is None:
        return ""

    key = params.get('key', '')
    key_type = params.get('key_type', 'hex')
    data_type = params.get('data_type', 'hex')
    output_format = params.get('output_format', 'hex')

    if not key:
        return data

    if key_type.lower() == 'hex':
        try:
            key_bytes = bytes.fromhex(key.replace(' ', '').replace('\n', ''))
        except Exception as e:
            raise ValueError(f"XOR Key 不是有效的Hex字符串: {str(e)}")
    else:
        key_bytes = key.encode('utf-8')

    if not key_bytes:
        raise ValueError("XOR Key 不能为空")

    if data_type.lower() == 'hex':
        try:
            data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
        except Exception as e:
            raise ValueError(f"输入数据不是有效的Hex字符串: {str(e)}")
    else:
        data_bytes = data.encode('utf-8')

    result = bytes([b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data_bytes)])

    # output_format 支持: hex / utf-8
    if output_format and output_format.lower() == 'hex':
        return result.hex()
    if output_format and output_format.lower() == 'utf-8':
        # 显式要求 UTF-8：直接解码返回
        try:
            return result.decode('utf-8')
        except UnicodeDecodeError:
            return result.hex()
    # 自动检测模式：检查是否为可打印文本（支持非 ASCII Unicode）
    try:
        text_res = result.decode('utf-8')
        import unicodedata
        has_ctrl = any(
            unicodedata.category(c).startswith('C') and c not in '\n\r\t'
            for c in text_res
        )
        if has_ctrl:
            return result.hex()
        return text_res
    except Exception:
        return result.hex()


@register_operation('known_plaintext_helper')
def known_plaintext_helper(data, params):
    return data

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
    val_output_format = params.get('output_format')
    
    return DESEncoders.des_decrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                   key_type=val_key_type, iv_type=val_iv_type,
                                   data_type=val_data_type,
                                   output_format=val_output_format)

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
    val_output_format = params.get('output_format')
    
    return DESEncoders.triple_des_decrypt(data, key, mode, iv, padding, sboxes=sboxes,
                                          key_type=val_key_type, iv_type=val_iv_type,
                                          data_type=val_data_type,
                                          output_format=val_output_format)

# MD5哈希
from core.decoder.md5 import MD5Encoders
from core.decoder.extra_ciphers import ExtraCiphers

@register_operation('md5_hash')
def md5_hash(data, params):
    output_format = params.get('output_format', 'hex')
    init_values = params.get('init_values')
    k_table = params.get('k_table')
    shifts = params.get('shifts')
    val_data_type = params.get('data_type')
    salt = params.get('salt', '')
    salt_position = params.get('salt_position', 'suffix')
    
    return MD5Encoders.md5_hash(data, output_format=output_format,
                                init_values=init_values, k_table=k_table,
                                shifts=shifts, data_type=val_data_type,
                                salt=salt, salt_position=salt_position)


def _hash_with_salt(data, algorithm, params):
    output_format = params.get('output_format', 'hex')
    val_data_type = params.get('data_type')
    salt = params.get('salt', '')
    salt_position = params.get('salt_position', 'suffix')

    if not data:
        return ""

    if val_data_type and val_data_type.lower() == 'hex':
        try:
            data_bytes = bytes.fromhex(data.replace(' ', '').replace('\n', ''))
        except Exception as exc:
            raise ValueError("输入数据不是有效的Hex字符串") from exc
    else:
        data_bytes = data.encode('utf-8')

    if salt:
        salt_bytes = salt.encode('utf-8')
        pos = (salt_position or 'suffix').lower()
        if pos == 'prefix':
            data_bytes = salt_bytes + data_bytes
        elif pos == 'both':
            data_bytes = salt_bytes + data_bytes + salt_bytes
        else:
            data_bytes = data_bytes + salt_bytes

    h = hashlib.new(algorithm)
    h.update(data_bytes)
    if output_format.lower() == 'base64':
        return base64.b64encode(h.digest()).decode('utf-8')
    return h.hexdigest()


@register_operation('sha1_hash')
def sha1_hash(data, params):
    return _hash_with_salt(data, 'sha1', params)


@register_operation('sha256_hash')
def sha256_hash(data, params):
    return _hash_with_salt(data, 'sha256', params)


@register_operation('sha512_hash')
def sha512_hash(data, params):
    return _hash_with_salt(data, 'sha512', params)

# RC4流密码
from core.decoder.rc4 import RC4Encoders

@register_operation('rc4_encrypt')
def rc4_encrypt(data, params):
    key = params.get('key', '')
    swap_bytes = params.get('swap_bytes', False)
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_data_type = params.get('data_type')
    val_output_format = params.get('output_format')
    
    return RC4Encoders.rc4_encrypt(data, key, swap_bytes=swap_bytes, sbox=sbox,
                                   key_type=val_key_type, data_type=val_data_type,
                                   output_format=val_output_format)

@register_operation('rc4_decrypt')
def rc4_decrypt(data, params):
    key = params.get('key', '')
    swap_bytes = params.get('swap_bytes', False)
    sbox = params.get('sbox')
    val_key_type = params.get('key_type', 'utf-8')
    val_data_type = params.get('data_type')
    val_output_format = params.get('output_format')
    
    return RC4Encoders.rc4_decrypt(data, key, swap_bytes=swap_bytes, sbox=sbox,
                                   key_type=val_key_type, data_type=val_data_type,
                                   output_format=val_output_format)


# Extra block ciphers
@register_operation('blowfish_encrypt')
def blowfish_encrypt(data, params):
    return ExtraCiphers.blowfish_encrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type')
    )


@register_operation('blowfish_decrypt')
def blowfish_decrypt(data, params):
    return ExtraCiphers.blowfish_decrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type'),
        params.get('output_format')
    )


@register_operation('cast_encrypt')
def cast_encrypt(data, params):
    return ExtraCiphers.cast_encrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type')
    )


@register_operation('cast_decrypt')
def cast_decrypt(data, params):
    return ExtraCiphers.cast_decrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type'),
        params.get('output_format')
    )


@register_operation('arc2_encrypt')
def arc2_encrypt(data, params):
    return ExtraCiphers.arc2_encrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type')
    )


@register_operation('arc2_decrypt')
def arc2_decrypt(data, params):
    return ExtraCiphers.arc2_decrypt(
        data,
        params.get('key', ''),
        params.get('mode', 'ECB'),
        params.get('iv', ''),
        params.get('padding', 'pkcs7'),
        params.get('key_type', 'utf-8'),
        params.get('iv_type', 'utf-8'),
        params.get('data_type'),
        params.get('output_format')
    )


# Extra stream ciphers
@register_operation('chacha20_encrypt')
def chacha20_encrypt(data, params):
    return ExtraCiphers.chacha20_encrypt(
        data,
        params.get('key', ''),
        params.get('nonce', ''),
        params.get('key_type', 'utf-8'),
        params.get('nonce_type', 'utf-8'),
        params.get('data_type')
    )


@register_operation('chacha20_decrypt')
def chacha20_decrypt(data, params):
    return ExtraCiphers.chacha20_decrypt(
        data,
        params.get('key', ''),
        params.get('nonce', ''),
        params.get('key_type', 'utf-8'),
        params.get('nonce_type', 'utf-8'),
        params.get('data_type'),
        params.get('output_format')
    )


@register_operation('salsa20_encrypt')
def salsa20_encrypt(data, params):
    return ExtraCiphers.salsa20_encrypt(
        data,
        params.get('key', ''),
        params.get('nonce', ''),
        params.get('key_type', 'utf-8'),
        params.get('nonce_type', 'utf-8'),
        params.get('data_type')
    )


@register_operation('salsa20_decrypt')
def salsa20_decrypt(data, params):
    return ExtraCiphers.salsa20_decrypt(
        data,
        params.get('key', ''),
        params.get('nonce', ''),
        params.get('key_type', 'utf-8'),
        params.get('nonce_type', 'utf-8'),
        params.get('data_type'),
        params.get('output_format')
    )
