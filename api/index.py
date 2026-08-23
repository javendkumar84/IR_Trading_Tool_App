# Vercel Serverless Entrypoint for FastAPI
from backend.main import app

# Export ASGI handler
handler = app
