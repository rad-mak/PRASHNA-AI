"""Prashna-AI — FastAPI Application Entry Point."""

import os
import asyncio
import urllib.request
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.routes import auth, content, quiz, analytics, admin
from backend.config import SUPABASE_URL, SUPABASE_KEY

KEEP_ALIVE_INTERVAL = 240  # 4 minutes (Render sleeps after ~15 min of inactivity)


async def _ping_render():
    """Self-ping the Render service to prevent it from sleeping."""
    url = os.environ.get("RENDER_EXTERNAL_URL")
    if not url:
        return
    try:
        urllib.request.urlopen(f"{url}/api/health", timeout=10)
        print(f"[keep-alive] Render ping OK ({url})", flush=True)
    except Exception as e:
        print(f"[keep-alive] Render ping failed: {e}", flush=True)


async def _ping_supabase():
    """Ping the Supabase REST API to keep the free-tier project active."""
    if not SUPABASE_URL:
        return
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        )
        urllib.request.urlopen(req, timeout=10)
        print("[keep-alive] Supabase ping OK", flush=True)
    except Exception as e:
        print(f"[keep-alive] Supabase ping failed: {e}", flush=True)


async def keep_alive_loop():
    """Background loop that pings both Render and Supabase every few minutes."""
    while True:
        await asyncio.sleep(KEEP_ALIVE_INTERVAL)
        await _ping_render()
        await _ping_supabase()


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(keep_alive_loop())
    yield
    task.cancel()

app = FastAPI(
    title="Prashna-AI",
    description="Adaptive AI-Powered Quiz & Question Generator",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — always return JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    # Database / network connectivity errors → 503
    import httpx as _httpx
    if isinstance(exc, (RuntimeError,)) and "unavailable" in str(exc).lower():
        return JSONResponse(
            status_code=503,
            content={"detail": str(exc)},
        )
    if isinstance(exc, (_httpx.ConnectError, _httpx.TimeoutException)):
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Database service is temporarily unavailable. "
                "Please try again in a few moments."
            },
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )

# Mount route modules
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# Health check — MUST be above the catch-all route so the keep-alive ping works
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "prashna-ai"}


from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    # Serve assets folder
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Catch-all route to serve React app and handle client-side routing
    @app.get("/{full_path:path}")
    async def serve_static(full_path: str, request: Request):
        # Ignore API routes
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API Route Not Found"})
            
        # Serve specific requested files (like favicon.ico, images)
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Fallback to index.html for React Router
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        return JSONResponse(status_code=404, content={"detail": "Index file not found"})
else:
    # Fallback for local development if frontend isn't built
    @app.get("/")
    async def root():
        return {
            "name": "Prashna-AI",
            "version": "1.0.0",
            "description": "Adaptive AI-Powered Quiz & Question Generator",
            "docs": "/docs",
            "note": "Frontend static files not found. Run 'npm run build' in frontend directory to serve."
        }

