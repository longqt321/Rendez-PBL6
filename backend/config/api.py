import logging
import uuid
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import exception_handler as drf_exception_handler


class Pagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


def exception_handler(exc, context):
    request_id = getattr(context.get("request"), "request_id", uuid.uuid4().hex)
    response = drf_exception_handler(exc, context)
    if response is not None:
        data = response.data
        code = getattr(exc, "default_code", "error")
        if isinstance(data, dict) and "detail" in data:
            message = str(data["detail"])
            fields = {}
            code = getattr(data["detail"], "code", code)
        elif isinstance(data, list):
            message = " ".join(str(item) for item in data)
            fields = {}
        else:
            message = "Kiểm tra lại thông tin đã nhập."
            fields = data
        response.data = {
            "code": code,
            "message": message,
            "fields": fields,
            "request_id": request_id,
        }
    else:
        logging.getLogger(__name__).error("API request failed", exc_info=True)
        response = Response(
            {
                "code": "server_error",
                "message": "Không xử lý được yêu cầu. Thử lại sau.",
                "fields": {},
                "request_id": request_id,
            },
            status=500,
        )
    return response


def csrf_failure(request, reason=""):
    from django.http import JsonResponse

    return JsonResponse(
        {
            "code": "csrf_failed",
            "message": "Phiên truy cập không hợp lệ. Tải lại trang rồi thử lại.",
            "fields": {},
        },
        status=403,
    )
