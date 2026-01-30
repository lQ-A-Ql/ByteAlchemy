
import sys
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import JSONResponse

# Ensure core modules are in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.decoder.base import BaseEncoders
from core.decoder.sm4 import SM4Encoders
from core.decoder.html import HtmlEncoders
from core.decoder.url import UrlEncoders
from core.decoder.unicode import UnicodeEncoders
from core.decoder.pipeline import Pipeline, Operation, OPERATION_REGISTRY
from core.decoder.aes_pure import AesPureEncoders
from app.logic.main_logic import MainLogic
from app.logic.sbox_manager import SBoxManager
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from typing import Dict, Any, List

sbox_manager = SBoxManager()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DecodeRequest(BaseModel):
    data: str
    params: Optional[dict] = {}

class EncodeRequest(BaseModel):
    data: str
    params: Optional[dict] = {}

class PipelineOperation(BaseModel):
    name: str
    params: Dict[str, Any] = {}

class PipelineRequest(BaseModel):
    data: str
    operations: List[PipelineOperation]

class ConvertRequest(BaseModel):
    data: str
    from_fmt: str
    to_fmt: str
    separator: str = None

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Decoder Pro Backend"}

# --- Base64 ---
@app.post("/api/base64/encode")
def base64_encode(req: EncodeRequest):
    try:
        url_safe = req.params.get('url_safe', False)
        result = BaseEncoders.base64_encode(req.data, url_safe=url_safe)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/base64/decode")
def base64_decode(req: DecodeRequest):
    try:
        url_safe = req.params.get('url_safe', False)
        result = BaseEncoders.base64_decode(req.data, url_safe=url_safe)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Base32 ---
@app.post("/api/base32/encode")
def base32_encode(req: EncodeRequest):
    try:
        result = BaseEncoders.base32_encode(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/base32/decode")
def base32_decode(req: DecodeRequest):
    try:
        result = BaseEncoders.base32_decode(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Base16 (Hex) ---
@app.post("/api/base16/encode")
def base16_encode(req: EncodeRequest):
    try:
        result = BaseEncoders.base16_encode(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/base16/decode")
def base16_decode(req: DecodeRequest):
    try:
        result = BaseEncoders.base16_decode(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Base85 ---
@app.post("/api/base85/encode")
def base85_encode(req: EncodeRequest):
    try:
        variant = req.params.get('variant', 'ascii85')
        result = BaseEncoders.base85_encode(req.data, variant=variant)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/base85/decode")
def base85_decode(req: DecodeRequest):
    try:
        variant = req.params.get('variant', 'ascii85')
        result = BaseEncoders.base85_decode(req.data, variant=variant)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# Formatter APIs
# ==========================================
from core.formatter import JsonFormatter, XmlFormatter, HtmlFormatter, SqlFormatter, CssFormatter
try:
    from core.formatter import PythonFormatter
except ImportError:
    PythonFormatter = None

class FormatRequest(BaseModel):
    data: str
    type: str  # json, python, xml, html, sql, css
    indent: int = 4

@app.post("/api/format")
def format_code(req: FormatRequest):
    try:
        fmt_type = req.type.lower()
        result = ""
        
        if fmt_type == 'json':
            result = JsonFormatter.format_json(req.data, indent=req.indent)
        elif fmt_type == 'python':
            if PythonFormatter is None:
                raise HTTPException(status_code=500, detail="Python formatter not initialized")
            result = PythonFormatter.format_python(req.data)
        elif fmt_type == 'xml':
            result = XmlFormatter.format_xml(req.data, indent=req.indent)
        elif fmt_type == 'html':
            result = HtmlFormatter.format_html(req.data, indent=req.indent)
        elif fmt_type == 'sql':
            result = SqlFormatter.format_sql(req.data, indent=req.indent)
        elif fmt_type == 'css':
            result = CssFormatter.format_css(req.data, indent=req.indent)
        else:
             raise HTTPException(status_code=400, detail=f"Unsupported format type: {fmt_type}")
             
        if result.startswith("[错误]"):
             raise HTTPException(status_code=400, detail=result)
             
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Regex APIs
# ==========================================
from core.regex import RegexUtils, RegexGenerator

class RegexGenerateRequest(BaseModel):
    include_digits: bool = False
    include_lower: bool = False
    include_upper: bool = False
    custom_chars: str = ""
    exclude_chars: str = ""

@app.post("/api/regex/escape")
def regex_escape(req: EncodeRequest):
    try:
        result = RegexUtils.escape_text(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/regex/generate")
def regex_generate(req: RegexGenerateRequest):
    try:
        result = RegexGenerator.generate_pattern(
            include_digits=req.include_digits,
            include_lower=req.include_lower,
            include_upper=req.include_upper,
            custom_chars=req.custom_chars,
            exclude_chars=req.exclude_chars
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))# --- AES ---
class AesRequest(BaseModel):
    data: str
    key: str
    mode: str = 'CBC'
    iv: str = ''
    padding: str = 'pkcs7'
    sbox_name: Optional[str] = "Standard AES"
    key_type: str = 'utf-8'
    iv_type: str = 'utf-8'
    swap_key_schedule: bool = False
    swap_data_round: bool = False
    data_type: Optional[str] = None # 'hex', 'base64', 'text'

@app.post("/api/aes/encrypt")
def aes_encrypt(req: AesRequest):
    try:
        sbox = sbox_manager.get_sbox(req.sbox_name)
        # Now always use Pure implementation as it's the only one remaining
        result = AesPureEncoders.encrypt(req.data, req.key, req.mode, req.iv, req.padding, sbox=sbox,
                                       swap_key_schedule=req.swap_key_schedule,
                                       swap_data_round=req.swap_data_round,
                                       key_type=req.key_type,
                                       iv_type=req.iv_type,
                                       data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/aes/decrypt")
def aes_decrypt(req: AesRequest):
    try:
        sbox = sbox_manager.get_sbox(req.sbox_name)
        # Now always use Pure implementation
        result = AesPureEncoders.decrypt(req.data, req.key, req.mode, req.iv, req.padding, sbox=sbox,
                                       swap_key_schedule=req.swap_key_schedule,
                                       swap_data_round=req.swap_data_round,
                                       key_type=req.key_type,
                                       iv_type=req.iv_type,
                                       data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- SM4 ---
class Sm4Request(BaseModel):
    data: str
    key: str
    mode: str = 'ECB'
    iv: str = ''
    padding: str = 'pkcs7'
    sbox_name: Optional[str] = "Standard SM4"
    key_type: str = 'utf-8'
    iv_type: str = 'utf-8'
    swap_endian: bool = False # Deprecated, mapped to both
    swap_key_schedule: bool = False
    swap_data_round: bool = False
    data_type: Optional[str] = None # 'hex', 'base64', 'text'

@app.post("/api/sm4/encrypt")
def sm4_encrypt(req: Sm4Request):
    try:
        sbox = sbox_manager.get_sbox(req.sbox_name)
        result = SM4Encoders.sm4_encrypt(req.data, req.key, req.mode, req.iv, req.padding, sbox=sbox,
                                       key_type=req.key_type, iv_type=req.iv_type, 
                                       swap_key_schedule=req.swap_key_schedule,
                                       swap_data_round=req.swap_data_round,
                                       swap_endian=req.swap_endian,
                                       data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/sm4/decrypt")
def sm4_decrypt(req: Sm4Request):
    try:
        sbox = sbox_manager.get_sbox(req.sbox_name)
        result = SM4Encoders.sm4_decrypt(req.data, req.key, req.mode, req.iv, req.padding, sbox=sbox,
                                       key_type=req.key_type, iv_type=req.iv_type, 
                                       swap_key_schedule=req.swap_key_schedule,
                                       swap_data_round=req.swap_data_round,
                                       swap_endian=req.swap_endian,
                                       data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- DES ---
from core.decoder.des import DESEncoders

class DesRequest(BaseModel):
    data: str
    key: str
    mode: str = 'ECB'
    iv: str = ''
    padding: str = 'pkcs7'
    sboxes: Optional[str] = None  # JSON string of 8 S-boxes
    key_type: str = 'utf-8'
    iv_type: str = 'utf-8'
    data_type: Optional[str] = None

@app.post("/api/des/encrypt")
def des_encrypt(req: DesRequest):
    try:
        result = DESEncoders.des_encrypt(req.data, req.key, req.mode, req.iv, req.padding,
                                         sboxes=req.sboxes, key_type=req.key_type,
                                         iv_type=req.iv_type, data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/des/decrypt")
def des_decrypt(req: DesRequest):
    try:
        result = DESEncoders.des_decrypt(req.data, req.key, req.mode, req.iv, req.padding,
                                         sboxes=req.sboxes, key_type=req.key_type,
                                         iv_type=req.iv_type, data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- 3DES ---
class TripleDesRequest(BaseModel):
    data: str
    key: str
    mode: str = 'ECB'
    iv: str = ''
    padding: str = 'pkcs7'
    sboxes: Optional[str] = None
    key_type: str = 'utf-8'
    iv_type: str = 'utf-8'
    data_type: Optional[str] = None

@app.post("/api/3des/encrypt")
def triple_des_encrypt(req: TripleDesRequest):
    try:
        result = DESEncoders.triple_des_encrypt(req.data, req.key, req.mode, req.iv, req.padding,
                                                sboxes=req.sboxes, key_type=req.key_type,
                                                iv_type=req.iv_type, data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/3des/decrypt")
def triple_des_decrypt(req: TripleDesRequest):
    try:
        result = DESEncoders.triple_des_decrypt(req.data, req.key, req.mode, req.iv, req.padding,
                                                sboxes=req.sboxes, key_type=req.key_type,
                                                iv_type=req.iv_type, data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- MD5 ---
from core.decoder.md5 import MD5Encoders

class Md5Request(BaseModel):
    data: str
    output_format: str = 'hex'  # 'hex' or 'base64'
    init_values: Optional[str] = None  # JSON or comma-separated hex
    k_table: Optional[str] = None  # JSON array of 64 values
    shifts: Optional[str] = None  # JSON array of 64 values
    data_type: Optional[str] = None

@app.post("/api/md5/hash")
def md5_hash(req: Md5Request):
    try:
        result = MD5Encoders.md5_hash(req.data, output_format=req.output_format,
                                      init_values=req.init_values, k_table=req.k_table,
                                      shifts=req.shifts, data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- RC4 ---
from core.decoder.rc4 import RC4Encoders

class Rc4Request(BaseModel):
    data: str
    key: str
    swap_bytes: bool = False
    sbox: Optional[str] = None  # Custom initial S-box
    key_type: str = 'utf-8'
    data_type: Optional[str] = None

@app.post("/api/rc4/encrypt")
def rc4_encrypt(req: Rc4Request):
    try:
        result = RC4Encoders.rc4_encrypt(req.data, req.key, swap_bytes=req.swap_bytes,
                                         sbox=req.sbox, key_type=req.key_type,
                                         data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/rc4/decrypt")
def rc4_decrypt(req: Rc4Request):
    try:
        result = RC4Encoders.rc4_decrypt(req.data, req.key, swap_bytes=req.swap_bytes,
                                         sbox=req.sbox, key_type=req.key_type,
                                         data_type=req.data_type)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- HTML / URL / Unicode ---
@app.post("/api/html/encode")
def html_encode(req: EncodeRequest):
    return {"result": HtmlEncoders.html_encode(req.data)}

@app.post("/api/html/decode")
def html_decode(req: EncodeRequest):
    return {"result": HtmlEncoders.html_decode(req.data)}

@app.post("/api/url/encode")
def url_encode(req: EncodeRequest):
    return {"result": UrlEncoders.url_encode(req.data)}

@app.post("/api/url/decode")
def url_decode(req: EncodeRequest):
    return {"result": UrlEncoders.url_decode(req.data)}

@app.post("/api/unicode/encode")
def unicode_encode(req: EncodeRequest):
    return {"result": UnicodeEncoders.unicode_encode(req.data)}

@app.post("/api/unicode/decode")
def unicode_decode(req: EncodeRequest):
    return {"result": UnicodeEncoders.unicode_decode(req.data)}

# ==========================================
# Pipeline and Utility APIs
# ==========================================
logic = MainLogic()

@app.post("/api/pipeline/run")
def pipeline_run(req: PipelineRequest):
    try:
        pipeline = Pipeline()
        for op_info in req.operations:
            if op_info.name in OPERATION_REGISTRY:
                func = OPERATION_REGISTRY[op_info.name]
                params = op_info.params.copy()
                if 'sbox_name' in params:
                    params['sbox'] = sbox_manager.get_sbox(params['sbox_name'])
                pipeline.add_operation(Operation(op_info.name, func, params))
            else:
                raise HTTPException(status_code=400, detail=f"Operation {op_info.name} not registered")
        
        result = pipeline.run(req.data)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/utils/convert_format")
def convert_format(req: ConvertRequest):
    try:
        result = logic.convert_format(req.data, req.from_fmt, req.to_fmt, req.separator)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/utils/endian_swap")
def endian_swap(req: ConvertRequest):
    try:
        result = logic.transform_endian(req.data, req.from_fmt, req.separator)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# S-Box Manager APIs
# ==========================================
class SBoxSaveRequest(BaseModel):
    name: str
    content: str # Hex stream or JSON list

@app.get("/api/sbox/names")
def get_sbox_names():
    return {"names": sbox_manager.get_all_names()}

@app.get("/api/sbox/get/{name}")
def get_sbox(name: str):
    sbox = sbox_manager.get_sbox(name)
    # Return as hex string for editor convenience
    sbox_hex = ' '.join([f'{b:02x}' for b in sbox])
    return {"name": name, "content": sbox_hex, "is_standard": (name in ["Standard SM4", "Standard AES", "Standard RC4"])}

@app.post("/api/sbox/save")
def save_sbox(req: SBoxSaveRequest):
    try:
        content = req.content.strip()
        if content.startswith('[') and content.endswith(']'):
            import json
            sbox = json.loads(content)
        else:
            clean_hex = content.replace(' ', '').replace('\n', '').replace('\r', '')
            sbox = [int(clean_hex[i:i+2], 16) for i in range(0, len(clean_hex), 2)]
        
        if len(sbox) != 256:
            raise ValueError("S-Box must be 256 bytes")
            
        if not sbox_manager.add_sbox(req.name, sbox):
            raise HTTPException(status_code=403, detail="Cannot overwrite standard S-Box")
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/sbox/delete/{name}")
def delete_sbox(name: str):
    if sbox_manager.remove_sbox(name):
        return {"status": "success"}
    raise HTTPException(status_code=403, detail="Cannot delete standard S-Box or item not found")

# ==========================================
# Script Library APIs
# ==========================================
from core.script import ScriptManager
from starlette.responses import StreamingResponse

script_manager = ScriptManager()

class ScriptCreateRequest(BaseModel):
    name: str
    content: str
    description: str = ""

class ScriptUpdateRequest(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None

@app.get("/api/scripts")
def list_scripts():
    """获取所有脚本列表"""
    return {"scripts": script_manager.list_scripts()}

@app.post("/api/scripts")
def create_script(req: ScriptCreateRequest):
    """上传新脚本"""
    try:
        result = script_manager.add_script(req.name, req.content, req.description)
        return {"status": "success", "script": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/scripts/{script_id}")
def get_script(script_id: str):
    """获取脚本详情"""
    script = script_manager.get_script(script_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"script": script}

@app.put("/api/scripts/{script_id}")
def update_script(script_id: str, req: ScriptUpdateRequest):
    """更新脚本"""
    try:
        result = script_manager.update_script(
            script_id, 
            name=req.name, 
            content=req.content, 
            description=req.description
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Script not found")
        return {"status": "success", "script": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/scripts/{script_id}")
def delete_script(script_id: str):
    """删除脚本"""
    if script_manager.delete_script(script_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Script not found")

@app.post("/api/scripts/{script_id}/run")
def run_script(script_id: str):
    """运行脚本并返回完整输出"""
    try:
        result = script_manager.run_script_sync(script_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/scripts/{script_id}/run-stream")
def run_script_stream(script_id: str):
    """运行脚本并流式返回输出 (SSE)"""
    def generate():
        for line in script_manager.run_script(script_id):
            yield f"data: {line}\n\n"
        yield "event: done\ndata: done\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


# ==================== Key Reconstruction API ====================
try:
    from importlib import import_module
    key_recreat_blocks = import_module("core.key_recreat.blocks")
    key_recreat_generator = import_module("core.key_recreat.generator")
    key_recreat_custom = import_module("core.key_recreat.custom_blocks")
except ImportError as e:
    key_recreat_blocks = None
    key_recreat_generator = None
    key_recreat_custom = None
    print(f"Failed to import key reconstruction modules: {e}")


class KeyBlockChain(BaseModel):
    blocks: List[Dict[str, Any]]
    func_name: str = "transform_key"
    args: str = "data"


class KeyExecuteRequest(BaseModel):
    code: str
    input_hex: str = ""


@app.get("/api/key-blocks")
def get_key_blocks():
    """获取所有积木块定义"""
    if key_recreat_blocks is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    
    blocks_data = key_recreat_blocks.get_all_blocks()
    
    # Inject sbox list into options where needed
    # (Existing logic...)
    
    # Also add names needed for Select params
    blocks_data["sbox_list"] = sbox_manager.get_all_names()

    return JSONResponse(blocks_data)

@app.post("/api/key-blocks/custom")
async def save_custom_block_endpoint(request: Request):
    if key_recreat_custom is None:
        raise HTTPException(status_code=500, detail="Custom blocks module not loaded")
    
    try:
        data = await request.json()
        block_id = data.get("block_id")
        block_def = data.get("block_def")
        
        if not block_id or not block_def:
            raise HTTPException(status_code=400, detail="Missing block_id or block_def")
            
        success = key_recreat_custom.save_custom_block(block_id, block_def)
        return JSONResponse({"success": success})
    except Exception as e:
        print(f"Error saving custom block: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.delete("/api/key-blocks/custom/{block_id}")
async def delete_custom_block_endpoint(block_id: str):
    if key_recreat_custom is None:
        raise HTTPException(status_code=500, detail="Custom blocks module not loaded")
    
    try:
        success = key_recreat_custom.delete_custom_block(block_id)
        return JSONResponse({"success": success})
    except Exception as e:
        print(f"Error deleting custom block: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.post("/api/key-generate")
def generate_key_code(request: KeyBlockChain):
    """根据积木配置生成代码"""
    if key_recreat_generator is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    
    try:
        code = key_recreat_generator.generate_function(
            func_name=request.func_name,
            block_chain=request.blocks,
            args=request.args
        )
        return {"code": code}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/key-parse")
async def parse_key_code_endpoint(request: Request):
    try:
        data = await request.json()
        code = data.get("code", "")
        if not code:
            return JSONResponse({"success": False, "error": "Code is empty"})
            
        from core.key_recreat.blocks import get_all_blocks
        from core.key_recreat.parser import parse_code_to_blocks
        
        blocks_def = get_all_blocks()["blocks"]
        chain = parse_code_to_blocks(code, blocks_def)
        
        return JSONResponse({"success": True, "chain": chain})
    except Exception as e:
        print(f"Error parsing code: {e}")
        return JSONResponse({"success": False, "error": str(e)})

@app.post("/api/key-execute")
def execute_key_code(request: KeyExecuteRequest):
    """执行生成的代码"""
    if key_recreat_generator is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    
    try:
        input_data = bytes.fromhex(request.input_hex) if request.input_hex else b""
        result = key_recreat_generator.execute_code(request.code, input_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==========================================
# Terminal WebSocket Handler (Integrated)
# ==========================================
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
from core.script.terminal_server import TerminalSession

@app.websocket("/ws/terminal")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # 调试日志
    log_file = os.path.join(os.path.expanduser("~"), "byte_alchemy_terminal_ws.log")
    def log(msg):
        try:
            with open(log_file, "a") as f:
                f.write(f"{msg}\n")
        except: pass
        print(msg)

    session = TerminalSession()
    log("New WebSocket connection accepted")

    async def _send_loop():
        """从PTY读取并发送到WS"""
        try:
            while session.running:
                # 使用 run_in_executor 避免阻塞 asyncio loop
                output = await asyncio.get_event_loop().run_in_executor(
                    None, session.read, 0.05
                )
                if output:
                    await websocket.send_text(output)
                else:
                    await asyncio.sleep(0.02)
        except Exception as e:
            log(f"Send loop error: {e}")

    send_task = None
    try:
        # Determine CWD
        initial_cwd = None
        if os.environ.get("APPIMAGE"):
            initial_cwd = os.path.dirname(os.environ["APPIMAGE"])
        else:
            initial_cwd = os.getcwd()
            
        # 1. 握手/初始化
        # 不同于 websockets 库，FastAPI 已经 accept 了
        # 等待客户端发送 INIT
        try:
            init_msg = await websocket.receive_text()
            if init_msg.startswith("INIT:"):
                parts = init_msg.split(":")
                rows = int(parts[1]) if len(parts) > 1 else 24
                cols = int(parts[2]) if len(parts) > 2 else 80
                session.start(rows, cols, cwd=initial_cwd)
                log(f"Session started with size {rows}x{cols}, cwd={initial_cwd}")
            else:
                session.start(cwd=initial_cwd)
                log(f"Session started with default size, cwd={initial_cwd}")
        except Exception as e:
            log(f"Init failed: {e}")
            await websocket.close()
            return

        if not session.running:
            await websocket.send_text("\033[1;31m[Error] Failed to start terminal session\033[0m\r\n")
            await websocket.close()
            return

        await websocket.send_text("\033[1;32m[Terminal Ready - Integrated]\033[0m\r\n")
        
        # 启动发送任务
        send_task = asyncio.create_task(_send_loop())
        
        # 接收循环
        while True:
            message = await websocket.receive_text()
            
            if not session.running:
                break
                
            if message.startswith("RESIZE:"):
                parts = message.split(":")
                rows = int(parts[1]) if len(parts) > 1 else 24
                cols = int(parts[2]) if len(parts) > 2 else 80
                session.resize(rows, cols)
            elif message.startswith("CMD:"):
                cmd = message[4:]
                session.write(cmd + "\r\n")
            else:
                session.write(message)
                
    except WebSocketDisconnect:
        log("WebSocket disconnected")
    except Exception as e:
        log(f"WebSocket error: {e}")
    finally:
        if send_task:
            send_task.cancel()
        session.stop()
        log("Session stopped")

if __name__ == "__main__":
    # Electron will likely spawn this process. 
    # Using specific port 3333 to avoid conflicts (configurable)
    uvicorn.run(app, host="0.0.0.0", port=3335)

