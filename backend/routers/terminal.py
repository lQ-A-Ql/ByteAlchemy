import asyncio
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.script.terminal_server import TerminalSession


router = APIRouter()


@router.websocket("/ws/terminal")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    log_file = os.path.join(os.path.expanduser("~"), "byte_alchemy_terminal_ws.log")

    def log(message: str):
        try:
            with open(log_file, "a", encoding="utf-8") as file:
                file.write(f"{message}\n")
        except Exception:
            pass
        print(message)

    session = TerminalSession()
    log("New WebSocket connection accepted")

    async def send_loop():
        try:
            while session.running:
                output = await asyncio.get_event_loop().run_in_executor(None, session.read, 0.05)
                if output:
                    await websocket.send_text(output)
                else:
                    await asyncio.sleep(0.02)
        except Exception as exc:
            log(f"Send loop error: {exc}")

    send_task = None
    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        initial_cwd = os.path.dirname(os.environ["APPIMAGE"]) if os.environ.get("APPIMAGE") else (project_root if os.path.isdir(project_root) else os.getcwd())

        try:
            init_message = await websocket.receive_text()
            if init_message.startswith("INIT:"):
                parts = init_message.split(":")
                rows = int(parts[1]) if len(parts) > 1 else 24
                cols = int(parts[2]) if len(parts) > 2 else 80
                session.start(rows, cols, cwd=initial_cwd)
                log(f"Session started with size {rows}x{cols}, cwd={initial_cwd}")
            else:
                session.start(cwd=initial_cwd)
                log(f"Session started with default size, cwd={initial_cwd}")
        except Exception as exc:
            log(f"Init failed: {exc}")
            await websocket.close()
            return

        if not session.running:
            await websocket.send_text("\033[1;31m[Error] Failed to start terminal session\033[0m\r\n")
            await websocket.close()
            return

        backend_mode = getattr(session, "backend_mode", "unknown")
        await websocket.send_text(f"\033[1;32m[Terminal Ready | {backend_mode}]\033[0m\r\n")
        send_task = asyncio.create_task(send_loop())

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
                session.write(message[4:] + "\r\n")
            else:
                session.write(message)
    except WebSocketDisconnect:
        log("WebSocket disconnected")
    except Exception as exc:
        log(f"WebSocket error: {exc}")
    finally:
        if send_task:
            send_task.cancel()
        session.stop()
        log("Session stopped")
