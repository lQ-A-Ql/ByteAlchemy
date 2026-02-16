"""
代码生成器 - 将积木配置转换为 Python 代码
"""

from typing import List, Dict, Any, Set
from .blocks import BLOCKS


def generate_code(block_chain: List[Dict[str, Any]]) -> str:
    """
    从积木链生成 Python 代码
    
    Args:
        block_chain: 积木配置列表，每个元素包含:
            - block_id: 积木块ID
            - params: 参数值字典
            - children: 子积木（用于容器类积木如for循环）
    
    Returns:
        生成的 Python 代码字符串
    """
    imports: Set[str] = set()
    lines: List[str] = []
    
    def process_block(block: Dict[str, Any], indent: int = 0) -> None:
        block_id = block.get("block_id", "")
        params = block.get("params", {})
        children = block.get("children", [])
        
        if block_id not in BLOCKS:
            lines.append(f"{'    ' * indent}# Unknown block: {block_id}")
            return
        
        block_def = BLOCKS[block_id]
        code_template = block_def.get("code", "")
        
        # 收集需要的 imports
        if "imports" in block_def:
            imports.update(block_def["imports"])
        
        # 替换参数
        code = code_template
        for param_def in block_def.get("params", []):
            param_name = param_def["name"]
            param_value = params.get(param_name, param_def.get("default", ""))
            code = code.replace(f"{{{param_name}}}", str(param_value))
        
        # 添加缩进
        indented_code = "    " * indent + code
        lines.append(indented_code)
        
        # 处理子积木（容器类）
        if block_def.get("is_container") and children:
            for child in children:
                process_block(child, indent + 1)
    
    # 处理所有积木
    for block in block_chain:
        process_block(block)
    
    # 生成最终代码
    result_lines = []
    
    # 添加 imports
    if imports:
        for imp in sorted(imports):
            result_lines.append(f"import {imp}")
        result_lines.append("")
    
    # 添加代码
    result_lines.extend(lines)
    
    return "\n".join(result_lines)


def generate_function(
    func_name: str,
    block_chain: List[Dict[str, Any]],
    args: str = "data"
) -> str:
    """
    生成完整的函数代码
    
    Args:
        func_name: 函数名
        block_chain: 积木配置列表
        args: 函数参数
    
    Returns:
        生成的函数代码字符串
    """
    imports: Set[str] = set()
    lines: List[str] = []
    
    def process_block(block: Dict[str, Any], indent: int = 1) -> None:
        block_id = block.get("block_id", "")
        params = block.get("params", {})
        children = block.get("children", [])
        
        if block_id not in BLOCKS:
            lines.append(f"{'    ' * indent}# Unknown block: {block_id}")
            return
        
        block_def = BLOCKS[block_id]
        code_template = block_def.get("code", "")
        
        # 收集需要的 imports
        if "imports" in block_def:
            imports.update(block_def["imports"])
        
        # 替换参数
        code = code_template
        for param_def in block_def.get("params", []):
            param_name = param_def["name"]
            param_value = params.get(param_name, param_def.get("default", ""))
            code = code.replace(f"{{{param_name}}}", str(param_value))
        
        # 处理多行代码
        for line in code.split("\n"):
            lines.append("    " * indent + line)
        
        # 如果是变换类积木，添加 data 赋值
        if block_def.get("input") == "bytes" and block_def.get("output") == "bytes":
            if not code.startswith("data ="):
                lines[-1] = lines[-1].replace(code.strip(), f"data = {code.strip()}")
        
        # 处理子积木
        if block_def.get("is_container"):
            if children:
                for child in children:
                    process_block(child, indent + 1)
            else:
                # 容器块但没有子块时添加 pass
                lines.append("    " * (indent + 1) + "pass  # TODO: 添加操作")
    
    # 生成函数定义
    lines.append(f"def {func_name}({args}):")
    
    # 处理所有积木
    for block in block_chain:
        process_block(block)
    
    # 添加默认返回
    if not any("return" in line for line in lines):
        lines.append("    return data")
    
    # 生成最终代码
    result_lines = []
    
    # 添加 imports
    if imports:
        for imp in sorted(imports):
            result_lines.append(f"import {imp}")
        result_lines.append("")
    
    result_lines.extend(lines)
    
    return "\n".join(result_lines)


def execute_code(code: str, input_data: bytes = b"") -> Dict[str, Any]:
    """
    执行生成的代码
    
    Args:
        code: Python 代码
        input_data: 输入数据 (bytes)
    
    Returns:
        执行结果字典
    """
    try:
        # Convert input to hex string for the function call
        input_hex_string = input_data.hex() if input_data else ""
        
        # 准备执行环境
        local_vars = {
            "data": input_hex_string,  # Pass as hex string for user convenience
            "result": None,
        }
        global_vars = {
            "__builtins__": __builtins__,
        }
        
        # 执行代码 (this defines imports and functions)
        exec(code, global_vars, local_vars)
        
        # Merge local_vars into global_vars so imports are accessible when calling function
        global_vars.update(local_vars)
        
        # Check if a function was defined (e.g., transform_key, reconstruct_key)
        # If so, call it with input as hex STRING (not bytes)
        result = None
        for name, value in local_vars.items():
            if callable(value) and name not in ('data', 'result'):
                # Found a defined function, call it with HEX STRING
                try:
                    # Update function's globals to include imports
                    if hasattr(value, '__globals__'):
                        value.__globals__.update(global_vars)
                    result = value(input_hex_string)  # Pass hex string, not bytes
                    break
                except Exception as call_error:
                    import traceback
                    return {
                        "success": False,
                        "error": f"函数调用错误: {call_error}\n{traceback.format_exc()}",
                    }
        
        # If no function was found/called, fall back to checking 'data' variable
        if result is None:
            result = local_vars.get("data", local_vars.get("result"))
        
        if isinstance(result, bytes):
            return {
                "success": True,
                "result": result.hex(),
                "result_bytes": list(result),
            }
        else:
            return {
                "success": True,
                "result": str(result),
            }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": f"{str(e)}\n{traceback.format_exc()}",
        }
