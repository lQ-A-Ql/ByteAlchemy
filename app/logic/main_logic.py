import re
from app.interfaces.main_interface import IMainLogic

from core.decoder.pipeline import Pipeline, Operation, OPERATION_REGISTRY
from core.decoder.base import BaseEncoders
from core.decoder.html import HtmlEncoders
from core.decoder.unicode import UnicodeEncoders
from core.decoder.url import UrlEncoders
from core.decoder.aes_pure import AesPureEncoders
from core.decoder.sm4 import SM4Encoders
from core.formatter.json_formatter import JsonFormatter
from core.formatter.python_formatter import PythonFormatter

class MainLogic(IMainLogic):
    """主逻辑实现"""
    
    def __init__(self):
        self.pipeline = Pipeline()
        self._init_encoders()

    def generate_regex(self, text: str) -> str:
        """生成正则表达式 (转义特殊字符)"""
        if not text:
            return ""
        return re.escape(text)
        
        self.pipeline = Pipeline()
        self._init_encoders()
        
    def _init_encoders(self):
        """初始化编码器集合"""
        class EncoderCollection:
            def __init__(self):
                # 注册各模块编码器
                for module in [BaseEncoders, HtmlEncoders, UnicodeEncoders, UrlEncoders, AesPureEncoders, SM4Encoders]:
                    for attr in dir(module):
                        if not attr.startswith('_'):
                            setattr(self, attr, getattr(module, attr))
                            
        self.encoders = EncoderCollection()

    def execute_operation(self, op_name: str, data: str, params: dict) -> str:
        """执行单个操作"""
        # AES / SM4 需要参数
        if op_name in ["AES 加密", "AES 解密"]:
            if op_name == "AES 加密":
                return self.encoders.encrypt(data, params['key'], params['mode'], params['iv'], params['padding'],
                                            key_type=params.get('key_type', 'utf-8'), 
                                            iv_type=params.get('iv_type', 'utf-8'),
                                            data_type=params.get('data_type'))
            else:
                return self.encoders.decrypt(data, params['key'], params['mode'], params['iv'], params['padding'],
                                            key_type=params.get('key_type', 'utf-8'), 
                                            iv_type=params.get('iv_type', 'utf-8'),
                                            data_type=params.get('data_type'))
                
        if op_name in ["SM4 加密", "SM4 解密"]:
            # SM4 可能有魔改S盒参数，这里预留处理
            # params 应该包含 'sbox' 如果有
            sbox = params.get('sbox', None)
            if op_name == "SM4 加密":
                return self.encoders.sm4_encrypt(data, params.get('key'), params.get('mode'), params.get('iv'), params.get('padding'), sbox=sbox)
            else:
                return self.encoders.sm4_decrypt(data, params.get('key'), params.get('mode'), params.get('iv'), params.get('padding'), sbox=sbox)

        # 映射表
        mapping = {
            "Base16 编码": "base16_encode", "Base16 解码": "base16_decode",
            "Base32 编码": "base32_encode", "Base32 解码": "base32_decode",
            "Base64 编码": "base64_encode", "Base64 解码": "base64_decode",
            "Base85 编码": "base85_encode", "Base85 解码": "base85_decode",
            "HTML 编码": "html_encode", "HTML 解码": "html_decode",
            "Unicode 编码": "unicode_encode", "Unicode 解码": "unicode_decode",
            "URL 编码": "url_encode", "URL 解码": "url_decode",
        }
        
        func_name = mapping.get(op_name)
        if func_name and hasattr(self.encoders, func_name):
            return getattr(self.encoders, func_name)(data)
            
        raise ValueError(f"未知的操作: {op_name}")

    def run_process_chain(self, chain_names: list, input_text: str, params_provider_func) -> str:
        """执行操作链"""
        self.pipeline.operations.clear()
        
        # 映射UI名称到注册名称
        name_mapping = {
            "Base16 编码": "base16_encode", "Base16 解码": "base16_decode",
            "Base32 编码": "base32_encode", "Base32 解码": "base32_decode",
            "Base64 编码": "base64_encode", "Base64 解码": "base64_decode",
            "Base85 编码": "base85_encode", "Base85 解码": "base85_decode",
            "HTML 编码": "html_encode", "HTML 解码": "html_decode",
            "Unicode 编码": "unicode_encode", "Unicode 解码": "unicode_decode",
            "URL 编码": "url_encode", "URL 解码": "url_decode",
            "AES 加密": "aes_encrypt", "AES 解密": "aes_decrypt",
            "SM4 加密": "sm4_encrypt", "SM4 解密": "sm4_decrypt",
        }

        for op_name in chain_names:
            func_name = name_mapping.get(op_name)
            if func_name and func_name in OPERATION_REGISTRY:
                func = OPERATION_REGISTRY[func_name]
                # 获取参数 (回调UI层获取当前参数)
                params = params_provider_func()
                self.pipeline.add_operation(Operation(op_name, func, params))
        
        return self.pipeline.run(input_text)

    def convert_format(self, text: str, from_fmt: str, to_fmt: str, separator: str = None) -> str:
        """转换文本格式 (支持hex分隔符)"""
        if from_fmt == to_fmt:
            return text
        
        try:
            # 1. 统一转为 bytes
            data = None
            if from_fmt == "UTF-8":
                data = text.encode('utf-8')
            elif from_fmt == "HEX":
                # 处理分隔符
                clean_hex = text.strip()
                if separator:
                    clean_hex = clean_hex.replace(separator, '')
                
                # 总是移除常见干扰字符 (如果不是作为分隔符)
                if separator != ' ':
                    clean_hex = clean_hex.replace(' ', '')
                if separator != '\n':
                    clean_hex = clean_hex.replace('\n', '')
                if separator != '\r':
                    clean_hex = clean_hex.replace('\r', '')
                    
                # 移除 0x 或 \x 如果存在且未被当作分隔符处理掉 (例如 0x12 0x34)
                clean_hex = clean_hex.replace('0x', '').replace('\\x', '')
                
                try:
                    data = bytes.fromhex(clean_hex)
                except ValueError:
                    return f"[错误] 无效的HEX数据"
            elif from_fmt == "ASCII":
                data = text.encode('ascii')
            else:
                # 默认
                data = text.encode('utf-8')

            # 2. bytes 转为目标格式
            if to_fmt == "UTF-8":
                return data.decode('utf-8', errors='replace')
            elif to_fmt == "HEX":
                return data.hex().upper()
            elif to_fmt == "ASCII":
                return data.decode('ascii', errors='replace')
            
            return data.decode('utf-8', errors='replace')
            
        except Exception as e:
            return f"[转换错误] {str(e)}"

    def format_code(self, text: str, code_type: str) -> str:
        """代码格式化"""
        if code_type == "JSON":
            return JsonFormatter.format_json(text)
        elif code_type == "Python":
            return PythonFormatter.format_python(text)
        else:
            return f"[错误] 不支持的格式类型: {code_type}"

    def transform_endian(self, text: str, fmt: str, separator: str = None) -> str:
        """端序转换 (Big-Endian <-> Little-Endian)"""
        if not text:
            return ""
            
        try:
            if fmt == "HEX":
                # 处理分隔符
                clean_hex = text.strip()
                if separator:
                    clean_hex = clean_hex.replace(separator, '')
                
                # 清理
                if separator != ' ':
                    clean_hex = clean_hex.replace(' ', '')
                if separator != '\n':
                    clean_hex = clean_hex.replace('\n', '')
                if separator != '\r':
                    clean_hex = clean_hex.replace('\r', '')
                clean_hex = clean_hex.replace('0x', '').replace('\\x', '')

                try:
                    data = bytes.fromhex(clean_hex)
                    # 翻转字节
                    reversed_data = data[::-1]
                    return reversed_data.hex().upper()
                except ValueError:
                    return f"[错误] 无效的HEX数据"
            else:
                # 文本模式：直接翻转字符串 (模拟字节翻转的效果)
                return text[::-1]
        except Exception as e:
            return f"[转换错误] {str(e)}"
