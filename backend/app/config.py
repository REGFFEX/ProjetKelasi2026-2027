from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "mysql+pymysql://kelasi:kelasi_pw@localhost:3306/kelasi"
    JWT_SECRET: str = "change-me"
    JWT_EXPIRE_MINUTES: int = 10080
    COOKIE_NAME: str = "kelasi_session"
    CORS_ORIGIN: str = "http://localhost:3000"
    ENV: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


settings = Settings()
