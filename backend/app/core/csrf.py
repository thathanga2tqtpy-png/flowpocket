from fastapi import Request, HTTPException, status
from app.core.config import settings
from urllib.parse import urlparse


def verify_csrf(request: Request) -> None:
    """
    CSRF verification for state-changing requests using cookie authentication.
    Validates Origin or Referer header against configured CORS origins.
    """
    # Safe methods do not require CSRF verification
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # In local/test development, allow requests without Origin if testclient is used
    if settings.APP_ENV in ("test", "local"):
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        if not origin and not referer:
            return

    origin = request.headers.get("origin")
    if origin:
        if origin not in settings.CORS_ORIGINS and origin != settings.FRONTEND_ORIGIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cảnh báo CSRF: Nguồn gốc yêu cầu không hợp lệ (Origin mismatch)",
            )
        return

    referer = request.headers.get("referer")
    if referer:
        parsed = urlparse(referer)
        referer_origin = f"{parsed.scheme}://{parsed.netloc}"
        if referer_origin not in settings.CORS_ORIGINS and referer_origin != settings.FRONTEND_ORIGIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cảnh báo CSRF: Nguồn gốc yêu cầu không hợp lệ (Referer mismatch)",
            )
        return

    # In production, require Origin or Referer for mutations
    if settings.APP_ENV == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cảnh báo CSRF: Thiếu tiêu đề Origin hoặc Referer",
        )

