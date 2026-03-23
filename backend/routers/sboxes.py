import json

from fastapi import APIRouter, HTTPException

from backend.schemas import SBoxSaveRequest
from backend.state import sbox_manager


router = APIRouter()


@router.get("/api/sbox/names")
def get_sbox_names():
    return {"names": sbox_manager.get_all_names()}


@router.get("/api/sbox/get/{name}")
def get_sbox(name: str):
    sbox = sbox_manager.get_sbox(name)
    return {
        "name": name,
        "content": " ".join(f"{byte:02x}" for byte in sbox),
        "is_standard": name in {"Standard SM4", "Standard AES", "Standard RC4", "Standard DES"},
    }


@router.post("/api/sbox/save")
def save_sbox(req: SBoxSaveRequest):
    try:
        content = req.content.strip()
        if content.startswith("[") and content.endswith("]"):
            sbox = json.loads(content)
        else:
            clean_hex = content.replace(" ", "").replace("\n", "").replace("\r", "")
            sbox = [int(clean_hex[index:index + 2], 16) for index in range(0, len(clean_hex), 2)]

        if len(sbox) != 256:
            raise ValueError("S-Box must be 256 bytes")
        if not sbox_manager.add_sbox(req.name, sbox):
            raise HTTPException(status_code=403, detail="Cannot overwrite standard S-Box")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/api/sbox/delete/{name}")
def delete_sbox(name: str):
    if sbox_manager.remove_sbox(name):
        return {"status": "success"}
    raise HTTPException(status_code=403, detail="Cannot delete standard S-Box or item not found")
