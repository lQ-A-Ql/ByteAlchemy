"""
积木块定义 - 密钥重构功能
每个积木块包含：name(显示名称), category(分类), params(参数列表), code(生成的代码模板)
"""

from typing import Dict, List, Any

# 积木块分类
CATEGORIES = {
    "malware": {"name": "恶意代码分析", "color": "#EF4444", "icon": "bug"},  # NEW
    "input": {"name": "输入", "color": "#10B981", "icon": "input"},
    "transform": {"name": "变换", "color": "#8B5CF6", "icon": "shuffle"},
    "bitwise": {"name": "位运算", "color": "#F59E0B", "icon": "binary"},
    "sbox": {"name": "S盒", "color": "#EC4899", "icon": "grid"},
    "crypto": {"name": "加密算法", "color": "#6366F1", "icon": "lock"},
    "ctypes": {"name": "CTypes/Libc", "color": "#8B5CF6", "icon": "cpu"}, # NEW
    "loop": {"name": "循环", "color": "#3B82F6", "icon": "repeat"},
    "function": {"name": "函数", "color": "#6366F1", "icon": "code"},
    "variable": {"name": "变量", "color": "#14B8A6", "icon": "variable"},
    "custom": {"name": "自定义", "color": "#F472B6", "icon": "star"}, # NEW
}

# 积木块定义
BLOCKS: Dict[str, Dict[str, Any]] = {
    # ========== 恶意代码分析类 [NEW] ==========
    "prng_cryptgenrandom": {
        "name": "CryptGenRandom (Sim)",
        "category": "malware",
        "params": [
            {"name": "length", "type": "number", "label": "长度", "default": "32"}
        ],
        "code": "import os\ndata = os.urandom({length})  # Simulating CryptGenRandom",
        "output": "bytes",
        "imports": ["os"],
    },
    "prng_weak_srand": {
        "name": "srand(Time) 弱随机",
        "category": "malware",
        "params": [
            {"name": "length", "type": "number", "label": "长度", "default": "32"}
        ],
        "code": "import random, time\nrandom.seed(int(time.time()*1000))  # srand(GetTickCount)\ndata = random.randbytes({length})",
        "output": "bytes",
        "imports": ["random", "time"],
    },
    "prng_custom_linear": {
        "name": "自定义线性同余生成器",
        "category": "malware",
        "params": [
            {"name": "seed", "type": "number", "label": "种子", "default": "12345"},
            {"name": "length", "type": "number", "label": "长度", "default": "16"}
        ],
        "code": "data = []\nseed = {seed}\nfor _ in range({length}):\n    seed = (seed * 1103515245 + 12345) & 0xFFFFFFFF\n    data.append(seed & 0xFF)\ndata = bytes(data)",
        "output": "bytes",
    },
    "dynamic_load_api": {
        "name": "动态API加载模式",
        "category": "malware",
        "params": [
            {"name": "dll", "type": "text", "label": "DLL名", "default": "advapi32.dll"},
            {"name": "func", "type": "text", "label": "函数名", "default": "CryptAcquireContextA"}
        ],
        "code": "# Simulating Dynamic Loading\nprint(f'[Analysis] Resolving {func} from {dll}...')\n# func_ptr = GetProcAddress(LoadLibrary('{dll}'), '{func}')",
    },
    
    # ========== 加密算法类 [NEW] ==========
    "crypto_genkey_aes": {
        "name": "AES密钥生成 (GenKey)",
        "category": "crypto",
        "params": [
           {"name": "bits", "type": "number", "label": "位数", "default": "256"}
        ],
        "code": "import os\nkey = os.urandom({bits}//8) # CryptGenKey AES-{bits}",
        "imports": ["os"],
    },
    "crypto_export_key": {
        "name": "导出密钥 (CryptExportKey)",
        "category": "crypto",
        "params": [],
        "code": "# Simulating CryptExportKey (RSA Encrypt Session Key)\n# In real malware, this uses the public key to encrypt 'key'\ndata = b'MOCK_RSA_BLOB_' + key",
    },
    "hash_md5": {
        "name": "MD5哈希",
        "category": "crypto",
        "params": [],
        "code": "import hashlib\ndata = hashlib.md5(data).digest()",
        "imports": ["hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
     "hash_sha256": {
        "name": "SHA256哈希",
        "category": "crypto",
        "params": [],
        "code": "import hashlib\ndata = hashlib.sha256(data).digest()",
        "imports": ["hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
    "chacha20_init": {
        "name": "ChaCha20初始状态",
        "category": "crypto",
        "params": [],
        "code": "# ChaCha20 Magic Constants\nstate = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]\n# 'expand 32-byte k'",
    },

    # ========== CTypes / Libc 类 [NEW] ==========
    "hex_encode": {
        "name": "Hex编码",
        "category": "transform",
        "params": [],
        "code": "data = data.hex()",
        "input": "bytes",
        "output": "text",
    },
    "base64_encode": {
        "name": "Base64编码",
        "category": "transform",
        "params": [],
        "code": "import base64\ndata = base64.b64encode(data).decode('utf-8')",
        "imports": ["base64"],
        "input": "bytes",
        "output": "text",
    },
    "base64_decode": {
        "name": "Base64解码",
        "category": "transform",
        "params": [],
        "code": "import base64\ndata = base64.b64decode(data)",
        "imports": ["base64"],
        "input": "text",
        "output": "bytes",
    },
    "ctypes_load_library": {
        "name": "加载动态库 (CDLL)",
        "category": "ctypes",
        "params": [
            {"name": "lib_name", "type": "text", "label": "库名", "default": "libc.so.6"},
            {"name": "var_name", "type": "text", "label": "变量名", "default": "libc"}
        ],
        "code": "import ctypes\n{var_name} = ctypes.CDLL(\"{lib_name}\")",
        "imports": ["ctypes"],
    "hash_sha1": {
        "name": "SHA1哈希",
        "category": "crypto",
        "params": [],
        "code": "import hashlib\ndata = hashlib.sha1(data).digest()",
        "imports": ["hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
    },
    "int_from_bytes": {
        "name": "Bytes转Int",
        "category": "ctypes",
        "params": [
            {"name": "byteorder", "type": "text", "label": "字节序", "default": "big"}
        ],
        "code": "data = int.from_bytes(data, byteorder='{byteorder}')",
        "input": "bytes",
    "hash_sha512": {
        "name": "SHA512哈希",
        "category": "crypto",
        "params": [],
        "code": "import hashlib\ndata = hashlib.sha512(data).digest()",
        "imports": ["hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
    "hmac_sha256": {
        "name": "HMAC-SHA256",
        "category": "crypto",
        "params": [
            {"name": "key_hex", "type": "hex", "label": "Key(Hex)", "default": "00112233"}
        ],
        "code": "import hmac, hashlib\nkey = bytes.fromhex('{key_hex}')\ndata = hmac.new(key, data, hashlib.sha256).digest()",
        "imports": ["hmac", "hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
    "pbkdf2_sha256": {
        "name": "PBKDF2-SHA256",
        "category": "crypto",
        "params": [
            {"name": "salt_hex", "type": "hex", "label": "Salt(Hex)", "default": "00112233"},
            {"name": "iterations", "type": "number", "label": "迭代", "default": "1000"},
            {"name": "dklen", "type": "number", "label": "长度", "default": "32"}
        ],
        "code": "import hashlib\nsalt = bytes.fromhex('{salt_hex}')\ndata = hashlib.pbkdf2_hmac('sha256', data, salt, {iterations}, dklen={dklen})",
        "imports": ["hashlib"],
        "input": "bytes",
        "output": "bytes",
    },
    "crc32": {
        "name": "CRC32",
        "category": "crypto",
        "params": [],
        "code": "import zlib\ndata = zlib.crc32(data) & 0xFFFFFFFF",
        "imports": ["zlib"],
        "input": "bytes",
        "output": "int",
    },
    "adler32": {
        "name": "Adler32",
        "category": "crypto",
        "params": [],
        "code": "import zlib\ndata = zlib.adler32(data) & 0xFFFFFFFF",
        "imports": ["zlib"],
        "input": "bytes",
        "output": "int",
    },
        "output": "int",
    },
    "libc_srand": {
        "name": "libc.srand",
        "category": "ctypes",
        "params": [
             {"name": "lib_var", "type": "text", "label": "库变量", "default": "libc"},
             {"name": "seed", "type": "text", "label": "种子变量", "default": "data"}
        ],
        "code": "{lib_var}.srand({seed})",
    "int_to_bytes": {
        "name": "Int转Bytes",
        "category": "ctypes",
        "params": [
            {"name": "length", "type": "number", "label": "长度", "default": "4"},
            {"name": "byteorder", "type": "text", "label": "字节序", "default": "big"}
        ],
        "code": "data = int(data).to_bytes({length}, byteorder='{byteorder}', signed=False)",
        "input": "int",
        "output": "bytes",
    },
    },
    "libc_rand": {
        "name": "libc.rand",
        "category": "ctypes",
        "params": [
             {"name": "lib_var", "type": "text", "label": "库变量", "default": "libc"}
        ],
        "code": "data = {lib_var}.rand()",
        "output": "int",
    },
    "struct_pack": {
        "name": "Struct Pack",
        "category": "ctypes",
        "params": [
             {"name": "fmt", "type": "text", "label": "格式", "default": "<I"}
        ],
        "code": "import struct\ndata = struct.pack('{fmt}', data)",
        "imports": ["struct"],
        "input": "int",
        "output": "bytes",
    },
    "buffer_init": {
        "name": "初始化Buffer",
        "category": "ctypes",
        "params": [
             {"name": "var_name", "type": "text", "label": "变量名", "default": "key_buffer"}
        ],
        "code": "{var_name} = b''",
    },
    "buffer_append": {
        "name": "Buffer追加",
        "category": "ctypes",
        "params": [
             {"name": "target", "type": "text", "label": "Buffer变量", "default": "key_buffer"}
        ],
        "code": "{target} += data",
    },
    "int_and": {
        "name": "按位与 (Int)",
        "category": "bitwise",
         "params": [
             {"name": "mask", "type": "hex", "label": "掩码(Hex)", "default": "FFFFFFFF"}
        ],
        "code": "data = data & 0x{mask}",
    },

    # ========== 输入类 ==========
    "input_hex": {
        "name": "HEX输入",
        "category": "input",
        "params": [
            {"name": "hex_string", "type": "hex", "label": "HEX值", "default": "00"}
        ],
        "code": "data = bytes.fromhex('{hex_string}')",
        "output": "bytes",
    },
    "input_bytes": {
        "name": "字节数组",
        "category": "input",
        "params": [
            {"name": "bytes_list", "type": "text", "label": "字节列表", "default": "0, 1, 2, 3"}
        ],
        "code": "data = bytes([{bytes_list}])",
        "output": "bytes",
    },
    "input_string": {
        "name": "字符串",
        "category": "input", 
        "params": [
            {"name": "text", "type": "text", "label": "文本", "default": "hello"}
        ],
        "code": "data = '{text}'.encode('utf-8')",
        "output": "bytes",
    },
    "input_int": {
        "name": "整数",
        "category": "input",
        "params": [
            {"name": "value", "type": "number", "label": "数值", "default": "0"}
        ],
        "code": "data = {value}",
        "output": "int",
    },
    "input_range": {
        "name": "范围生成",
        "category": "input",
        "params": [
            {"name": "start", "type": "number", "label": "起始", "default": "0"},
            {"name": "end", "type": "number", "label": "结束", "default": "256"}
        ],
        "code": "data = bytes(range({start}, {end}))",
        "output": "bytes",
    },
    "hex_decode": {
        "name": "Hex解码",
        "category": "transform",
        "params": [],
        "code": "data = bytes.fromhex(data)",
        "input": "text",
        "output": "bytes",
    },

    # ========== 变换类 ==========
    "xor_const": {
        "name": "XOR常量",
        "category": "transform",
        "params": [
            {"name": "key", "type": "hex", "label": "XOR值", "default": "FF"}
        ],
        "code": "data = bytes(b ^ 0x{key} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "xor_key": {
        "name": "XOR密钥",
        "category": "transform",
        "params": [
            {"name": "key", "type": "hex", "label": "密钥", "default": "01020304"}
        ],
        "code": "import itertools\ndata = bytes(b ^ k for b, k in zip(data, itertools.cycle(bytes.fromhex('{key}'))))",
        "input": "bytes",
        "output": "bytes",
        "imports": ["itertools"],
    },
    "add_const": {
        "name": "加常量",
        "category": "transform",
        "params": [
            {"name": "value", "type": "number", "label": "值", "default": "1"},
            {"name": "mod", "type": "number", "label": "模", "default": "256"}
        ],
        "code": "data = bytes((b + {value}) % {mod} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "sub_const": {
        "name": "减常量",
        "category": "transform",
        "params": [
            {"name": "value", "type": "number", "label": "值", "default": "1"},
            {"name": "mod", "type": "number", "label": "模", "default": "256"}
        ],
        "code": "data = bytes((b - {value}) % {mod} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "mul_const": {
        "name": "乘常量",
        "category": "transform",
        "params": [
            {"name": "value", "type": "number", "label": "值", "default": "2"},
            {"name": "mod", "type": "number", "label": "模", "default": "256"}
        ],
        "code": "data = bytes((b * {value}) % {mod} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "reverse_bytes": {
        "name": "字节反转",
        "category": "transform",
        "params": [],
        "code": "data = data[::-1]",
        "input": "bytes",
        "output": "bytes",
    },
    "swap_pairs": {
        "name": "两两交换",
        "category": "transform",
        "params": [],
        "code": "data = bytes(data[i+1] if i % 2 == 0 else data[i-1] for i in range(len(data)) if i < len(data))",
        "input": "bytes",
        "output": "bytes",
    },

    # ========== 位运算类 ==========
    "rotate_left": {
        "name": "循环左移",
        "category": "bitwise",
        "params": [
            {"name": "bits", "type": "number", "label": "位数", "default": "1"}
        ],
        "code": "data = bytes(((b << {bits}) | (b >> (8 - {bits}))) & 0xFF for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "rotate_right": {
        "name": "循环右移",
        "category": "bitwise",
        "params": [
            {"name": "bits", "type": "number", "label": "位数", "default": "1"}
        ],
        "code": "data = bytes(((b >> {bits}) | (b << (8 - {bits}))) & 0xFF for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "shift_left": {
        "name": "左移",
        "category": "bitwise",
        "params": [
            {"name": "bits", "type": "number", "label": "位数", "default": "1"}
        ],
        "code": "data = bytes((b << {bits}) & 0xFF for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "shift_right": {
        "name": "右移",
        "category": "bitwise",
        "params": [
            {"name": "bits", "type": "number", "label": "位数", "default": "1"}
        ],
        "code": "data = bytes((b >> {bits}) & 0xFF for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "swap_nibbles": {
        "name": "半字节交换",
        "category": "bitwise",
        "params": [],
        "code": "data = bytes((b >> 4) | ((b & 0x0F) << 4) for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "bit_not": {
        "name": "按位取反",
        "category": "bitwise",
        "params": [],
        "code": "data = bytes(~b & 0xFF for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "and_const": {
        "name": "AND运算",
        "category": "bitwise",
        "params": [
            {"name": "mask", "type": "hex", "label": "掩码", "default": "0F"}
        ],
        "code": "data = bytes(b & 0x{mask} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },
    "or_const": {
        "name": "OR运算",
        "category": "bitwise",
        "params": [
            {"name": "mask", "type": "hex", "label": "掩码", "default": "F0"}
        ],
        "code": "data = bytes(b | 0x{mask} for b in data)",
        "input": "bytes",
        "output": "bytes",
    },

    # ========== S盒类 ==========
    "sbox_lookup": {
        "name": "S盒查表",
        "category": "sbox",
        "params": [
            {"name": "sbox_name", "type": "select", "label": "S盒", "options": "sbox_list"}
        ],
        "code": "data = bytes(SBOX[b] for b in data)  # Using {sbox_name}",
        "input": "bytes",
        "output": "bytes",
    },
    "sbox_inverse": {
        "name": "逆S盒查表",
        "category": "sbox",
        "params": [
            {"name": "sbox_name", "type": "select", "label": "S盒", "options": "sbox_list"}
        ],
        "code": "data = bytes(INV_SBOX[b] for b in data)  # Using inverse of {sbox_name}",
        "input": "bytes",
        "output": "bytes",
    },
    "custom_table": {
        "name": "自定义查表",
        "category": "sbox",
        "params": [
            {"name": "table", "type": "text", "label": "表(逗号分隔)", "default": "0,1,2,3..."}
        ],
        "code": "TABLE = [{table}]\ndata = bytes(TABLE[b] for b in data)",
        "input": "bytes",
        "output": "bytes",
    },

    # ========== 循环类 ==========
    "for_range": {
        "name": "FOR循环",
        "category": "loop",
        "params": [
            {"name": "count", "type": "number", "label": "次数", "default": "16"}
        ],
        "code": "for i in range({count}):",
        "is_container": True,
    },
    "for_each": {
        "name": "遍历字节",
        "category": "loop",
        "params": [],
        "code": "for b in data:",
        "is_container": True,
    },
    "while_cond": {
        "name": "WHILE循环",
        "category": "loop",
        "params": [
            {"name": "condition", "type": "text", "label": "条件", "default": "i < len(data)"}
        ],
        "code": "while {condition}:",
        "is_container": True,
    },

    # ========== 函数类 ==========
    "func_def": {
        "name": "定义函数",
        "category": "function",
        "params": [
            {"name": "name", "type": "text", "label": "函数名", "default": "transform_key"},
            {"name": "args", "type": "text", "label": "参数", "default": "data"}
        ],
        "code": "def {name}({args}):",
        "is_container": True,
    },
    "return_data": {
        "name": "返回数据",
        "category": "function",
        "params": [
             {"name": "var_name", "type": "text", "label": "变量", "default": "data"}
        ],
        "code": "return {var_name}",
    },
    "return_hex": {
        "name": "返回HEX",
        "category": "function",
        "params": [
             {"name": "var_name", "type": "text", "label": "变量", "default": "data"}
        ],
        "code": "return {var_name}.hex()",
    },
    "print_hex": {
        "name": "打印HEX",
        "category": "function",
        "params": [
             {"name": "var_name", "type": "text", "label": "变量", "default": "data"}
        ],
        "code": "print({var_name}.hex())",
    },

    # ========== 变量类 ==========
    "assign_var": {
        "name": "赋值",
        "category": "variable",
        "params": [
            {"name": "var_name", "type": "text", "label": "变量名", "default": "key"},
        ],
        "code": "{var_name} = data",
    },
    "load_var": {
        "name": "读取变量",
        "category": "variable",
        "params": [
            {"name": "var_name", "type": "text", "label": "变量名", "default": "key"},
        ],
        "code": "data = {var_name}",
    },
    "slice_data": {
        "name": "切片",
        "category": "variable",
        "params": [
            {"name": "start", "type": "number", "label": "起始", "default": "0"},
            {"name": "end", "type": "number", "label": "结束", "default": "16"}
        ],
        "code": "data = data[{start}:{end}]",
    },
    "concat_data": {
        "name": "拼接",
        "category": "variable",
        "params": [
            {"name": "other", "type": "text", "label": "另一变量", "default": "key2"}
        ],
        "code": "data = data + {other}",
    },
}


def get_all_blocks() -> Dict[str, Any]:
    """获取所有积木块定义（包含自定义积木）"""
    # Dynamic import to avoid circular dependency if any? 
    # Or just import at top?
    # Better import inside or top. Top is fine as custom_blocks doesn't import blocks.py
    from .custom_blocks import get_custom_blocks
    custom = get_custom_blocks()
    
    # Mark as custom
    for b in custom.values():
        b["is_custom"] = True
    
    # Merge custom blocks
    merged_blocks = BLOCKS.copy()
    merged_blocks.update(custom)
    
    return {
        "categories": CATEGORIES,
        "blocks": merged_blocks,
    }


def get_blocks_by_category(category: str) -> List[Dict[str, Any]]:
    """按分类获取积木块"""
    return [
        {"id": block_id, **block_def}
        for block_id, block_def in BLOCKS.items()
        if block_def.get("category") == category
    ]
