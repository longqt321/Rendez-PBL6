from django.template import Context, Template
from django.utils.safestring import mark_safe
from apps.photos.templatetags.ui_copy import ui_label


def test_labels_keep_html_and_accessible_association():
    tag = mark_safe('<label for="id_caption" class="required">Caption:</label>')
    assert ui_label(tag) == '<label for="id_caption" class="required">Mô tả ảnh:</label>'
    assert ui_label("Submitted at") == "Ngày gửi"
    assert ui_label("Chọn photo submission để thay đổi") == "Chọn đóng góp ảnh để thay đổi"
    assert ui_label("Thay đổi place") == "Thay đổi Địa điểm"


def test_unknown_text_is_preserved_and_plain_html_is_escaped():
    text = '<img src=x onerror="alert(1)">'
    output = Template("{% load ui_copy %}{{ label|ui_label }}").render(Context({"label": text}))
    assert "<img" not in output
    assert "&lt;img" in output
    assert ui_label("Tên quán đã nhập") == "Tên quán đã nhập"


def test_validation_messages_do_not_expose_error_object_repr():
    from rest_framework.exceptions import ValidationError
    from apps.photos.templatetags.ui_copy import validation_message

    error = ValidationError(
        {"caption": ["Mô tả quá dài."], "non_field_errors": ["Nhập lý do từ chối."]}
    )
    assert validation_message(error) == "Mô tả ảnh: Mô tả quá dài. Nhập lý do từ chối."
    assert "ErrorDetail" not in validation_message(error)
