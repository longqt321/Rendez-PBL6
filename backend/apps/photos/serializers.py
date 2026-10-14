from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from apps.places.models import Category, Place, public_places
from apps.places.serializers import CategorySerializer
from .models import (
    ContentReport,
    PhotoAsset,
    PhotoSubmission,
    PlacePhoto,
    VisualAttribute,
    PhotoComment,
)


class VisualAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisualAttribute
        fields = ("code", "display_name_vi", "description")
        read_only_fields = fields


class PublicPhotoSerializer(serializers.ModelSerializer):
    place_id = serializers.UUIDField(read_only=True)
    url = serializers.SerializerMethodField()
    width = serializers.IntegerField(source="asset.width")
    height = serializers.IntegerField(source="asset.height")
    attributes = serializers.SerializerMethodField()
    matched_attribute_codes = serializers.SerializerMethodField()
    author_name = serializers.CharField(
        source="asset.submission.submitted_by.display_name", read_only=True
    )
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = PlacePhoto
        fields = (
            "id",
            "place_id",
            "url",
            "width",
            "height",
            "alt_text",
            "caption",
            "published_at",
            "attributes",
            "matched_attribute_codes",
            "author_name",
            "is_owner",
            "attribution",
        )

        read_only_fields = fields

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(request and request.user.pk == obj.asset.submission.submitted_by_id)

    def get_url(self, obj) -> str:
        return f"/public-photo-media/{obj.id}/"

    @extend_schema_field(VisualAttributeSerializer(many=True))
    def get_attributes(self, obj):
        return VisualAttributeSerializer(
            [a for a in obj.attributes.all() if a.active], many=True
        ).data

    def get_matched_attribute_codes(self, obj) -> list[str]:
        codes = set(self.context.get("codes", []))
        return sorted(a.code for a in obj.attributes.all() if a.active and a.code in codes)


class VisualPlaceSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)
    cover_image_url = serializers.SerializerMethodField()
    is_saved = serializers.BooleanField(read_only=True)
    supporting_photo = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = (
            "id",
            "name",
            "category",
            "address",
            "latitude",
            "longitude",
            "cover_image_url",
            "is_saved",
            "supporting_photo",
        )

        read_only_fields = fields

    def get_cover_image_url(self, obj) -> str | None:
        photo_id = getattr(obj, "visual_cover_id", None)
        return f"/public-photo-media/{photo_id}/" if photo_id else None

    @extend_schema_field(PublicPhotoSerializer(allow_null=True))
    def get_supporting_photo(self, obj):
        photo = self.context.get("photos_by_id", {}).get(getattr(obj, "visual_support_id", None))
        return PublicPhotoSerializer(photo, context=self.context).data if photo else None


class FeedItemSerializer(serializers.Serializer):
    photo = PublicPhotoSerializer()
    place = VisualPlaceSerializer()


class PhotoDetailSerializer(PublicPhotoSerializer):
    place = serializers.SerializerMethodField()

    class Meta(PublicPhotoSerializer.Meta):
        fields = PublicPhotoSerializer.Meta.fields + ("place",)

    @extend_schema_field(VisualPlaceSerializer())
    def get_place(self, obj):
        return VisualPlaceSerializer(self.context["place"], context=self.context).data


class GalleryPageSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = PublicPhotoSerializer(many=True)


class AttributeEvidenceSerializer(serializers.Serializer):
    attribute = VisualAttributeSerializer()
    photo_ids = serializers.ListField(child=serializers.UUIDField())


class OpeningHoursSerializer(serializers.Serializer):
    text = serializers.CharField()
    source = serializers.CharField()
    verified_at = serializers.DateTimeField()


class VisualDetailSerializer(VisualPlaceSerializer):
    description = serializers.CharField()
    opening_hours = OpeningHoursSerializer(allow_null=True)
    photos = GalleryPageSerializer()
    attribute_evidence = AttributeEvidenceSerializer(many=True)
    source_url = serializers.URLField(allow_blank=True)
    verified_at = serializers.DateTimeField(allow_null=True)

    class Meta(VisualPlaceSerializer.Meta):
        fields = VisualPlaceSerializer.Meta.fields + (
            "description",
            "opening_hours",
            "photos",
            "attribute_evidence",
            "source_url",
            "verified_at",
        )


class VisualMapSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    total_places = serializers.IntegerField()
    truncated = serializers.BooleanField()
    results = VisualPlaceSerializer(many=True)


class SubmissionAssetSerializer(serializers.ModelSerializer):
    preview_url = serializers.SerializerMethodField()
    publication_status = serializers.SerializerMethodField()
    public_photo_id = serializers.SerializerMethodField()

    class Meta:
        model = PhotoAsset
        fields = ("id", "preview_url", "publication_status", "public_photo_id")

    def get_preview_url(self, obj) -> str:
        return f"/private-photo-media/{obj.id}/"

    def get_publication_status(self, obj) -> str:
        if not hasattr(obj, "public_photo"):
            return "pending_review"
        photo = obj.public_photo
        if photo.status == "published" and (
            photo.place.status != "published" or photo.place.deleted_at
        ):
            return "withdrawn"
        return photo.status

    def get_public_photo_id(self, obj) -> str | None:
        return str(obj.public_photo.id) if hasattr(obj, "public_photo") else None


class PhotoSubmissionSerializer(serializers.ModelSerializer):
    place_id = serializers.SerializerMethodField()
    place_name = serializers.SerializerMethodField()
    assets = SubmissionAssetSerializer(many=True)

    class Meta:
        model = PhotoSubmission
        fields = (
            "id",
            "place_id",
            "place_name",
            "caption",
            "status",
            "submitted_at",
            "published_at",
            "reason",
            "assets",
        )

        read_only_fields = fields

    def get_place_id(self, obj) -> str | None:
        place = obj.target_place
        return str(place.pk) if place else None

    def get_place_name(self, obj) -> str:
        return obj.place.name if obj.place_id else obj.proposal.name


class PhotoUploadSerializer(serializers.Serializer):
    images = serializers.ListField(child=serializers.FileField(), min_length=1, max_length=5)
    place_id = serializers.PrimaryKeyRelatedField(queryset=public_places(), required=False)
    proposed_name = serializers.CharField(max_length=200, required=False)
    proposed_address = serializers.CharField(max_length=500, required=False)
    proposed_category = serializers.SlugRelatedField(
        slug_field="slug", queryset=Category.objects.filter(is_active=True), required=False
    )
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-90, max_value=90, required=False
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, min_value=-180, max_value=180, required=False
    )
    caption = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    consent = serializers.BooleanField()
    consent_version = serializers.ChoiceField(
        choices=["photo-rights-v2"],
        error_messages={
            "invalid_choice": "Nội dung xác nhận quyền đăng đã thay đổi. Tải lại trang rồi thử lại."
        },
    )

    def validate(self, attrs):
        if not attrs["consent"]:
            raise serializers.ValidationError(
                {"consent": ["Xác nhận quyền đăng ảnh trước khi gửi."]}
            )
        proposal_keys = {"proposed_name", "proposed_address", "proposed_category"}
        if "place_id" in attrs:
            if proposal_keys.intersection(attrs) or "latitude" in attrs or "longitude" in attrs:
                raise serializers.ValidationError(
                    "Chọn quán có sẵn hoặc đề xuất quán mới, không chọn cả hai."
                )
        elif not proposal_keys.issubset(attrs):
            raise serializers.ValidationError("Nhập tên, địa chỉ và loại quán mới.")
        if ("latitude" in attrs) != ("longitude" in attrs):
            raise serializers.ValidationError("Nhập đủ vĩ độ và kinh độ.")
        return attrs


class ContentReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentReport
        fields = ("id", "reason", "note", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")


class CaptionSerializer(serializers.Serializer):
    caption = serializers.CharField(max_length=1000, allow_blank=True)


class PhotoCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="user.display_name", read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = PhotoComment
        fields = ("id", "body", "author_name", "is_owner", "created_at")
        read_only_fields = ("id", "author_name", "is_owner", "created_at")

    def get_is_owner(self, obj) -> bool:
        return obj.user_id == self.context["request"].user.pk
