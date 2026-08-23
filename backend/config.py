import os

class Settings:
    PROJECT_NAME: str = "Rates Trading Quant Platform Engine"
    API_V1_STR: str = "/api/v1"
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
