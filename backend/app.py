from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import codec, key_reconstruct, scripts, sboxes, terminal


def create_app() -> FastAPI:
    app = FastAPI(title="ByteAlchemy Backend")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def read_root():
        return {"status": "ok", "service": "ByteAlchemy Backend"}

    app.include_router(codec.router)
    app.include_router(sboxes.router)
    app.include_router(scripts.router)
    app.include_router(key_reconstruct.router)
    app.include_router(terminal.router)
    return app


app = create_app()
