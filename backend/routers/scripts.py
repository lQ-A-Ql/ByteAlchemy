from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from backend.schemas import ScriptCreateRequest, ScriptUpdateRequest
from backend.state import script_manager


router = APIRouter()


@router.get("/api/scripts")
def list_scripts():
    return {"scripts": script_manager.list_scripts()}


@router.post("/api/scripts")
def create_script(req: ScriptCreateRequest):
    try:
        return {"status": "success", "script": script_manager.add_script(req.name, req.content, req.description)}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/api/scripts/{script_id}")
def get_script(script_id: str):
    script = script_manager.get_script(script_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"script": script}


@router.put("/api/scripts/{script_id}")
def update_script(script_id: str, req: ScriptUpdateRequest):
    try:
        result = script_manager.update_script(script_id, name=req.name, content=req.content, description=req.description)
        if result is None:
            raise HTTPException(status_code=404, detail="Script not found")
        return {"status": "success", "script": result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/api/scripts/{script_id}")
def delete_script(script_id: str):
    if script_manager.delete_script(script_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Script not found")


@router.post("/api/scripts/{script_id}/run")
def run_script(script_id: str):
    try:
        return script_manager.run_script_sync(script_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/api/scripts/{script_id}/run-stream")
def run_script_stream(script_id: str):
    def generate():
        for line in script_manager.run_script(script_id):
            yield f"data: {line}\n\n"
        yield "event: done\ndata: done\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})
