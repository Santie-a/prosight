from pydantic import BaseModel


class ProviderStatus(BaseModel):
    ready: bool
    error: str | None = None


class HealthResponse(BaseModel):
    status: str        # "ready" | "degraded"
    providers: dict[str, ProviderStatus]