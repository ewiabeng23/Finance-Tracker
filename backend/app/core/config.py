from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://dikos_user:dikos_pass@localhost:5432/dikos_finance"
    SECRET_KEY: str = "change-this-to-a-strong-random-secret-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours — full working day

    class Config:
        env_file = ".env"

settings = Settings()
