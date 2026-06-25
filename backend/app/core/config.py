from sqlalchemy.engine import URL
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CasaEnPlenitudApp API"
    api_v1_prefix: str = "/api/v1"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    mysql_user: str
    mysql_password: str
    mysql_host: str
    mysql_port: int = 3306
    mysql_database: str
    initial_admin_username: str = "admin"
    initial_admin_email: str = "admin@casaenplenitud.local"
    initial_admin_password: str = "Admin1234!"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def sqlalchemy_database_uri(self) -> str:
        return URL.create(
            drivername="mysql+pymysql",
            username=self.mysql_user,
            password=self.mysql_password,
            host=self.mysql_host,
            port=self.mysql_port,
            database=self.mysql_database,
        ).render_as_string(hide_password=False)


settings = Settings()
