"""Every error leaves the API as {"message": str, "field"?: str}, which the frontend shows as-is."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        *,
        field: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.field = field
        self.headers = headers


def _body(message: str, field: str | None = None) -> dict[str, str]:
    return {"message": message, **({"field": field} if field else {})}


def _validation_message(exc: RequestValidationError) -> tuple[str, str | None]:
    errors = exc.errors()
    if not errors:
        return "Please check the form and try again.", None
    first = errors[0]
    loc = [str(part) for part in first.get("loc", ()) if part != "body"]
    field = loc[0] if loc else None
    message = str(first.get("msg", "Invalid value")).removeprefix("Value error, ")
    if first.get("type") == "json_invalid":
        return "Request body must be valid JSON.", None
    if first.get("type") == "missing" and field:
        return f"{field} is required.", field
    return message, field


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(_body(exc.message, exc.field), status_code=exc.status_code, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        message, field = _validation_message(exc)
        return JSONResponse(_body(message, field), status_code=400)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(_body(message), status_code=exc.status_code, headers=exc.headers)
