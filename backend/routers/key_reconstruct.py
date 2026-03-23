from importlib import import_module

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from backend.schemas import CustomBlockRequest, KeyBlockChain, KeyExecuteRequest, KeyParseRequest
from backend.state import sbox_manager


router = APIRouter()

try:
    key_blocks_module = import_module("core.key_reconstruct.blocks")
    key_generator_module = import_module("core.key_reconstruct.generator")
    key_custom_module = import_module("core.key_reconstruct.custom_blocks")
except ImportError as exc:
    key_blocks_module = None
    key_generator_module = None
    key_custom_module = None
    print(f"Failed to import key reconstruction modules: {exc}")


@router.get("/api/key-blocks")
def get_key_blocks():
    if key_blocks_module is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    blocks_data = key_blocks_module.get_all_blocks()
    blocks_data["sbox_list"] = sbox_manager.get_all_names()
    return JSONResponse(blocks_data)


@router.post("/api/key-blocks/custom")
def save_custom_block(req: CustomBlockRequest):
    if key_custom_module is None:
        raise HTTPException(status_code=500, detail="Custom blocks module not loaded")
    try:
        return JSONResponse({"success": key_custom_module.save_custom_block(req.block_id, req.block_def)})
    except Exception as exc:
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


@router.delete("/api/key-blocks/custom/{block_id}")
def delete_custom_block(block_id: str):
    if key_custom_module is None:
        raise HTTPException(status_code=500, detail="Custom blocks module not loaded")
    try:
        return JSONResponse({"success": key_custom_module.delete_custom_block(block_id)})
    except Exception as exc:
        return JSONResponse({"success": False, "error": str(exc)}, status_code=500)


@router.post("/api/key-generate")
def generate_key_code(req: KeyBlockChain):
    if key_generator_module is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    try:
        return {"code": key_generator_module.generate_function(func_name=req.func_name, block_chain=req.blocks, args=req.args)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/api/key-parse")
def parse_key_code(req: KeyParseRequest):
    try:
        if not req.code:
            return JSONResponse({"success": False, "error": "Code is empty"})
        from core.key_reconstruct.blocks import get_all_blocks
        from core.key_reconstruct.parser import parse_code_to_blocks

        chain = parse_code_to_blocks(req.code, get_all_blocks()["blocks"])
        return JSONResponse({"success": True, "chain": chain})
    except Exception as exc:
        return JSONResponse({"success": False, "error": str(exc)})


@router.post("/api/key-execute")
def execute_key_code(req: KeyExecuteRequest):
    if key_generator_module is None:
        raise HTTPException(status_code=500, detail="Key reconstruction module not loaded")
    try:
        input_data = bytes.fromhex(req.input_hex) if req.input_hex else b""
        return key_generator_module.execute_code(req.code, input_data)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
