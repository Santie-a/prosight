from pydantic import BaseModel, Field


class DescribeResponse(BaseModel):
    description: str
    detail_level: str
    processing_ms: int