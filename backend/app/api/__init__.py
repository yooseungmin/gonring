from fastapi import APIRouter
from .routes import analysis

api_router = APIRouter()

# Include the analysis routes
api_router.include_router(analysis.router)

# Add other route modules here as needed
# api_router.include_router(auth.router)
# api_router.include_router(boxes.router)
# api_router.include_router(contents.router)
