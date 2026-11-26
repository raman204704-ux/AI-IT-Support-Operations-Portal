import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException

from app.config import settings
from app.database import init_db
from app.routers import auth, chat, tickets, admin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("it_support_portal")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up AI IT Support Assistant Backend...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down AI IT Support Assistant Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Company Internal AI IT Support Chatbot powered by Groq LLM & Ticket Management System",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during MVP development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(tickets.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Serve the built React frontend (frontend/dist) as static files.
# Falls back to index.html for client-side routes (SPA).
DIST_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
            return await super().get_response("index.html", scope)
        if response.status_code == 404:
            return await super().get_response("index.html", scope)
        return response


if DIST_DIR.is_dir():
    app.mount("/", SPAStaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
else:
    logger.warning("Frontend build not found at %s; run 'npm run build' in frontend/", DIST_DIR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
