import time
import uuid


class NoStoreMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.monotonic()
        request.request_id = uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        duration_ms = round((time.monotonic() - start_time) * 1000, 2)
        response["X-Response-Time"] = f"{duration_ms}ms"
        if request.path.startswith(
            ("/api/", "/admin/", "/private-photo-media/", "/private-photo-original/")
        ):
            response["Cache-Control"] = "private, no-store"
        return response
