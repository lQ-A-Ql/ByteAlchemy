#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Additional block/stream ciphers for CTF usage.
"""

import base64
import os
from Crypto.Cipher import Blowfish, CAST, ARC2, ChaCha20, Salsa20
from Crypto.Util import Counter


def _parse_bytes(value: str, value_type: str, name: str) -> bytes:
    if value is None:
        return b""
    if value_type and value_type.lower() == "hex":
        try:
            return bytes.fromhex(value.replace(" ", "").replace("\n", ""))
        except Exception as exc:
            raise ValueError(f"{name}不是有效的Hex字符串") from exc
    return value.encode("utf-8")


def _pad(data: bytes, padding: str, block_size: int) -> bytes:
    padding = (padding or "pkcs7").lower()
    if padding == "nopadding":
        return data
    pad_len = block_size - (len(data) % block_size)
    if padding == "pkcs7":
        return data + bytes([pad_len] * pad_len)
    if padding == "zeropadding":
        return data + b"\x00" * pad_len
    if padding == "iso10126":
        return data + os.urandom(pad_len - 1) + bytes([pad_len])
    if padding == "ansix923":
        return data + b"\x00" * (pad_len - 1) + bytes([pad_len])
    return data + bytes([pad_len] * pad_len)


def _unpad(data: bytes, padding: str) -> bytes:
    padding = (padding or "pkcs7").lower()
    if padding == "nopadding":
        return data
    if padding == "zeropadding":
        return data.rstrip(b"\x00")
    if padding in ["pkcs7", "iso10126", "ansix923"]:
        pad_len = data[-1]
        if pad_len < 1 or pad_len > len(data):
            raise ValueError("Invalid padding length")
        return data[:-pad_len]
    pad_len = data[-1]
    return data[:-pad_len]


def _normalize_key(key_bytes: bytes, min_len: int, max_len: int) -> bytes:
    if len(key_bytes) < min_len or len(key_bytes) > max_len:
        raise ValueError(f"密钥长度必须在 {min_len}-{max_len} 字节之间")
    return key_bytes


def _text_or_hex(data: bytes, output_format: str = None) -> str:
    fmt = (output_format or "").lower()
    if fmt == "hex":
        return data.hex()
    if fmt == "base64":
        return base64.b64encode(data).decode("utf-8")
    if fmt == "utf-8":
        return data.decode("utf-8", errors="replace")

    try:
        text_res = data.decode("utf-8")
        import unicodedata
        has_ctrl = any(
            unicodedata.category(c).startswith("C") and c not in ["\n", "\r", "\t"]
            for c in text_res
        )
        if has_ctrl:
            return data.hex()
        return text_res
    except UnicodeDecodeError:
        return data.hex()
    except Exception:
        return data.hex()


def _encrypt_block(cipher_cls, data: str, key: str, mode: str, iv: str,
                   padding: str, key_type: str, iv_type: str, data_type: str,
                   key_min: int, key_max: int) -> str:
    if not data:
        return ""

    key_bytes = _normalize_key(_parse_bytes(key, key_type, "密钥"), key_min, key_max)
    if not key_bytes:
        raise ValueError("密钥不能为空")

    data_bytes = _parse_bytes(data, data_type, "输入数据") if data_type else data.encode("utf-8")

    mode_upper = (mode or "ECB").upper()
    needs_iv = mode_upper in ["CBC", "CFB", "OFB", "CTR"]
    iv_bytes = _parse_bytes(iv, iv_type, "IV") if iv else b""

    if needs_iv and iv_bytes and len(iv_bytes) != cipher_cls.block_size:
        raise ValueError(f"IV长度必须为 {cipher_cls.block_size} 字节")

    if needs_iv and not iv_bytes:
        iv_bytes = os.urandom(cipher_cls.block_size)
        iv_included = True
    else:
        iv_included = False

    if mode_upper == "CTR":
        if len(iv_bytes) < cipher_cls.block_size:
            raise ValueError(f"CTR模式需要 {cipher_cls.block_size} 字节IV")
        iv_int = int.from_bytes(iv_bytes[:cipher_cls.block_size], "big")
        counter = Counter.new(cipher_cls.block_size * 8, initial_value=iv_int)
        cipher = cipher_cls.new(key_bytes, cipher_cls.MODE_CTR, counter=counter)
        encrypted = cipher.encrypt(data_bytes)
    else:
        mode_map = {
            "ECB": cipher_cls.MODE_ECB,
            "CBC": cipher_cls.MODE_CBC,
            "CFB": cipher_cls.MODE_CFB,
            "OFB": cipher_cls.MODE_OFB,
        }
        if mode_upper not in mode_map:
            raise ValueError(f"Unsupported mode: {mode_upper}")
        if mode_upper == "ECB":
            cipher = cipher_cls.new(key_bytes, mode_map[mode_upper])
        else:
            cipher = cipher_cls.new(key_bytes, mode_map[mode_upper], iv=iv_bytes)

        if mode_upper in ["CFB", "OFB"]:
            padded = data_bytes
        else:
            padded = _pad(data_bytes, padding, cipher_cls.block_size)
        encrypted = cipher.encrypt(padded)

    if iv_included:
        encrypted = iv_bytes + encrypted

    return base64.b64encode(encrypted).decode("utf-8")


def _decrypt_block(cipher_cls, data: str, key: str, mode: str, iv: str,
                   padding: str, key_type: str, iv_type: str, data_type: str,
                   key_min: int, key_max: int, output_format: str = None) -> str:
    if not data:
        return ""

    key_bytes = _normalize_key(_parse_bytes(key, key_type, "密钥"), key_min, key_max)
    if not key_bytes:
        raise ValueError("密钥不能为空")

    try:
        if data_type and data_type.lower() == "hex":
            encrypted = bytes.fromhex(data.replace(" ", "").replace("\n", ""))
        else:
            encrypted = base64.b64decode(data)
    except Exception as exc:
        raise ValueError(f"输入数据解析失败: {str(exc)}") from exc

    mode_upper = (mode or "ECB").upper()
    needs_iv = mode_upper in ["CBC", "CFB", "OFB", "CTR"]

    iv_bytes = _parse_bytes(iv, iv_type, "IV") if iv else b""
    if needs_iv and iv_bytes and len(iv_bytes) != cipher_cls.block_size:
        raise ValueError(f"IV长度必须为 {cipher_cls.block_size} 字节")

    if needs_iv and not iv_bytes:
        iv_bytes = encrypted[:cipher_cls.block_size]
        encrypted = encrypted[cipher_cls.block_size:]

    if mode_upper == "CTR":
        if len(iv_bytes) < cipher_cls.block_size:
            raise ValueError(f"CTR模式需要 {cipher_cls.block_size} 字节IV")
        iv_int = int.from_bytes(iv_bytes[:cipher_cls.block_size], "big")
        counter = Counter.new(cipher_cls.block_size * 8, initial_value=iv_int)
        cipher = cipher_cls.new(key_bytes, cipher_cls.MODE_CTR, counter=counter)
        decrypted = cipher.decrypt(encrypted)
        return _text_or_hex(decrypted, output_format)

    mode_map = {
        "ECB": cipher_cls.MODE_ECB,
        "CBC": cipher_cls.MODE_CBC,
        "CFB": cipher_cls.MODE_CFB,
        "OFB": cipher_cls.MODE_OFB,
    }
    if mode_upper not in mode_map:
        raise ValueError(f"Unsupported mode: {mode_upper}")
    if mode_upper == "ECB":
        cipher = cipher_cls.new(key_bytes, mode_map[mode_upper])
    else:
        cipher = cipher_cls.new(key_bytes, mode_map[mode_upper], iv=iv_bytes)

    decrypted = cipher.decrypt(encrypted)
    if mode_upper in ["CFB", "OFB"]:
        final_bytes = decrypted
    else:
        final_bytes = _unpad(decrypted, padding)

    return _text_or_hex(final_bytes, output_format)


def _encrypt_stream(cipher_cls, data: str, key: str, nonce: str, key_type: str,
                    nonce_type: str, data_type: str, nonce_size: int,
                    key_len: int) -> str:
    if not data:
        return ""

    key_bytes = _parse_bytes(key, key_type, "密钥")
    if not key_bytes:
        raise ValueError("密钥不能为空")
    if len(key_bytes) != key_len:
        raise ValueError(f"密钥长度必须为 {key_len} 字节")

    data_bytes = _parse_bytes(data, data_type, "输入数据") if data_type else data.encode("utf-8")

    nonce_bytes = _parse_bytes(nonce, nonce_type, "Nonce") if nonce else b""
    if nonce_bytes and len(nonce_bytes) != nonce_size:
        raise ValueError(f"Nonce长度必须为 {nonce_size} 字节")

    if not nonce_bytes:
        nonce_bytes = os.urandom(nonce_size)
        nonce_included = True
    else:
        nonce_included = False

    cipher = cipher_cls.new(key=key_bytes, nonce=nonce_bytes)
    encrypted = cipher.encrypt(data_bytes)

    if nonce_included:
        encrypted = nonce_bytes + encrypted

    return base64.b64encode(encrypted).decode("utf-8")


def _decrypt_stream(cipher_cls, data: str, key: str, nonce: str, key_type: str,
                    nonce_type: str, data_type: str, nonce_size: int,
                    key_len: int, output_format: str = None) -> str:
    if not data:
        return ""

    key_bytes = _parse_bytes(key, key_type, "密钥")
    if not key_bytes:
        raise ValueError("密钥不能为空")
    if len(key_bytes) != key_len:
        raise ValueError(f"密钥长度必须为 {key_len} 字节")

    try:
        if data_type and data_type.lower() == "hex":
            encrypted = bytes.fromhex(data.replace(" ", "").replace("\n", ""))
        else:
            encrypted = base64.b64decode(data)
    except Exception as exc:
        raise ValueError(f"输入数据解析失败: {str(exc)}") from exc

    nonce_bytes = _parse_bytes(nonce, nonce_type, "Nonce") if nonce else b""
    if not nonce_bytes:
        nonce_bytes = encrypted[:nonce_size]
        encrypted = encrypted[nonce_size:]
    else:
        if len(nonce_bytes) != nonce_size:
            raise ValueError(f"Nonce长度必须为 {nonce_size} 字节")

    cipher = cipher_cls.new(key=key_bytes, nonce=nonce_bytes)
    decrypted = cipher.decrypt(encrypted)
    return _text_or_hex(decrypted, output_format)


class ExtraCiphers:
    """Extra block/stream cipher helpers."""

    @staticmethod
    def blowfish_encrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                         padding: str = "pkcs7", key_type: str = "utf-8",
                         iv_type: str = "utf-8", data_type: str = None) -> str:
        return _encrypt_block(Blowfish, data, key, mode, iv, padding,
                              key_type, iv_type, data_type, 4, 56)

    @staticmethod
    def blowfish_decrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                         padding: str = "pkcs7", key_type: str = "utf-8",
                        iv_type: str = "utf-8", data_type: str = None,
                        output_format: str = None) -> str:
        return _decrypt_block(Blowfish, data, key, mode, iv, padding,
                            key_type, iv_type, data_type, 4, 56, output_format)

    @staticmethod
    def cast_encrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                     padding: str = "pkcs7", key_type: str = "utf-8",
                     iv_type: str = "utf-8", data_type: str = None) -> str:
        return _encrypt_block(CAST, data, key, mode, iv, padding,
                              key_type, iv_type, data_type, 5, 16)

    @staticmethod
    def cast_decrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                     padding: str = "pkcs7", key_type: str = "utf-8",
                     iv_type: str = "utf-8", data_type: str = None,
                     output_format: str = None) -> str:
        return _decrypt_block(CAST, data, key, mode, iv, padding,
                              key_type, iv_type, data_type, 5, 16, output_format)

    @staticmethod
    def arc2_encrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                     padding: str = "pkcs7", key_type: str = "utf-8",
                     iv_type: str = "utf-8", data_type: str = None) -> str:
        return _encrypt_block(ARC2, data, key, mode, iv, padding,
                              key_type, iv_type, data_type, 5, 128)

    @staticmethod
    def arc2_decrypt(data: str, key: str, mode: str = "ECB", iv: str = "",
                     padding: str = "pkcs7", key_type: str = "utf-8",
                     iv_type: str = "utf-8", data_type: str = None,
                     output_format: str = None) -> str:
        return _decrypt_block(ARC2, data, key, mode, iv, padding,
                              key_type, iv_type, data_type, 5, 128, output_format)

    @staticmethod
    def chacha20_encrypt(data: str, key: str, nonce: str = "",
                         key_type: str = "utf-8", nonce_type: str = "utf-8",
                         data_type: str = None) -> str:
        return _encrypt_stream(ChaCha20, data, key, nonce, key_type,
                               nonce_type, data_type, 8, 32)

    @staticmethod
    def chacha20_decrypt(data: str, key: str, nonce: str = "",
                         key_type: str = "utf-8", nonce_type: str = "utf-8",
                     data_type: str = None, output_format: str = None) -> str:
        return _decrypt_stream(ChaCha20, data, key, nonce, key_type,
                         nonce_type, data_type, 8, 32, output_format)

    @staticmethod
    def salsa20_encrypt(data: str, key: str, nonce: str = "",
                        key_type: str = "utf-8", nonce_type: str = "utf-8",
                        data_type: str = None) -> str:
        return _encrypt_stream(Salsa20, data, key, nonce, key_type,
                               nonce_type, data_type, 8, 32)

    @staticmethod
    def salsa20_decrypt(data: str, key: str, nonce: str = "",
                        key_type: str = "utf-8", nonce_type: str = "utf-8",
                   data_type: str = None, output_format: str = None) -> str:
        return _decrypt_stream(Salsa20, data, key, nonce, key_type,
                       nonce_type, data_type, 8, 32, output_format)
