import logging
import time
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.dependencies import VLMDep
from app.schemas.vision import DescribeResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/vision", tags=["vision"])

VALID_DETAIL_LEVELS = {"read", "detailed", "navigation"}

PROMPTS = {
    "read": (
        "Read the text in the image.",
        "Do not include line breaks or quotes."
    ),
    "detailed": (
        "Describe this image in detail. Include the main subjects, "
        "their positions, any text visible, colors, and the overall context. "
        "If there's any text, insert it at the end as (...). Text: (...) ."
        "Write in clear, natural language."
    ),
    "navigation": (
        "Describe this image from a navigation and spatial awareness perspective. "
        "Focus on obstacles, pathways, people, signage, distances, and anything "
        "relevant to someone who needs to move through or interact with this environment."
    ),
}

MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


@router.post("/describe", response_model=DescribeResponse)
async def describe_image(
    vlm: VLMDep,
    image: UploadFile = File(..., description="JPEG or PNG image"),
    detail_level: str = Form(default="detailed"),
) -> DescribeResponse:
    # --- Validate detail level ---
    if detail_level not in VALID_DETAIL_LEVELS:
        raise HTTPException(
            status_code=422,
            detail=f"detail_level must be one of: {', '.join(sorted(VALID_DETAIL_LEVELS))}",
        )

    # --- Validate content type ---
    if image.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=415,
            detail="Only JPEG and PNG images are supported.",
        )

    # --- Read and size-check the image ---
    image_bytes = await image.read()
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds maximum allowed size of {MAX_IMAGE_SIZE_MB} MB.",
        )

    # --- Run inference ---
    prompt = PROMPTS[detail_level]
    logger.info(
        "Running VLM inference | detail_level=%s | size=%d bytes",
        detail_level,
        len(image_bytes),
    )

    start = time.perf_counter()
    try:
        description = vlm.describe(image_bytes, prompt)
    except Exception as e:
        logger.error("VLM inference failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Image description failed. See server logs for details.",
        )
    processing_ms = int((time.perf_counter() - start) * 1000)

    logger.info("VLM inference complete | %d ms", processing_ms)

    return DescribeResponse(
        description=description,
        detail_level=detail_level,
        processing_ms=processing_ms,
    )