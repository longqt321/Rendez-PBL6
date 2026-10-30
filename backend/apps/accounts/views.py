from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User


class ProfileSerializer(serializers.ModelSerializer):
    saved_count = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    @extend_schema_field(serializers.IntegerField())
    def get_saved_count(self, obj):
        from apps.favorites.models import Favorite

        return Favorite.objects.filter(
            user=obj, place__status="published", place__deleted_at__isnull=True
        ).count()

    @extend_schema_field(serializers.IntegerField())
    def get_photo_count(self, obj):
        from apps.photos.models import public_photos

        return public_photos().filter(asset__submission__submitted_by=obj).count()

    class Meta:
        model = User
        fields = ("id", "email", "display_name", "is_staff", "saved_count", "photo_count")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=4096)
    display_name = serializers.CharField(max_length=100, min_length=2, trim_whitespace=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return value

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], User(email=attrs["email"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254, required=False)
    password = serializers.CharField(
        write_only=True, trim_whitespace=False, max_length=4096, required=False
    )
    is_demo = serializers.BooleanField(required=False, default=False)


class CSRFView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response({"csrfToken": get_token(request), "debug_login": settings.DEBUG})


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    @extend_schema(request=RegisterSerializer, responses={201: ProfileSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = User.objects.create_user(**serializer.validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError({"email": ["Email đã được sử dụng."]}) from exc
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(ProfileSerializer(user).data, status=201)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses=ProfileSerializer)
    def post(self, request):
        if settings.DEBUG and (
            request.data.get("is_demo")
            or (not request.data.get("email") and not request.data.get("password"))
        ):
            user, _ = User.objects.get_or_create(
                email="demo@rendez.local",
                defaults={"display_name": "Khách dùng thử", "password": make_password(None)},
            )
            if not user.is_active or user.is_staff or user.is_superuser:
                raise serializers.ValidationError("Tài khoản dùng thử không khả dụng.")
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return Response(ProfileSerializer(user).data)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not serializer.validated_data.get("email") or not serializer.validated_data.get(
            "password"
        ):
            raise serializers.ValidationError(
                {"email": ["Vui lòng nhập đầy đủ email và mật khẩu."]}
            )
        user = authenticate(
            request,
            username=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if not user:
            raise serializers.ValidationError({"email": ["Email hoặc mật khẩu không đúng."]})
        login(request, user)
        return Response(ProfileSerializer(user).data)


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        logout(request)
        return Response(status=204)


class ProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=100, min_length=2, trim_whitespace=True)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=ProfileSerializer)
    def get(self, request):
        return Response(ProfileSerializer(request.user).data)

    @extend_schema(request=ProfileUpdateSerializer, responses=ProfileSerializer)
    def patch(self, request):
        values = ProfileUpdateSerializer(data=request.data)
        values.is_valid(raise_exception=True)
        request.user.display_name = values.validated_data["display_name"]
        request.user.save(update_fields=["display_name"])
        return Response(ProfileSerializer(request.user).data)

    @extend_schema(responses={204: None})
    def delete(self, request):
        if request.user.is_staff or request.user.is_superuser:
            raise serializers.ValidationError(
                "Tài khoản quản trị không thể tự xóa qua endpoint này."
            )

        user = request.user
        with transaction.atomic():
            from apps.favorites.models import Favorite
            from apps.photos.models import PhotoAudit, PhotoLike, PhotoSubmission, PlacePhoto
            from django.utils import timezone

            now = timezone.now()
            for photo in PlacePhoto.objects.filter(
                asset__submission__submitted_by=user, status="published"
            ):
                photo.status = "withdrawn"
                photo.withdrawn_at = photo.withdrawn_at or now
                photo.is_cover = False
                photo.save(update_fields=["status", "withdrawn_at", "is_cover"])

            Favorite.objects.filter(user=user).delete()
            PhotoLike.objects.filter(user=user).delete()

            user.is_active = False
            user.display_name = "Tài khoản đã đóng"
            user.set_unusable_password()
            user.save(update_fields=["is_active", "display_name", "password"])

            sub = PhotoSubmission.objects.filter(submitted_by=user).first()
            if sub:
                PhotoAudit.objects.create(
                    actor=user,
                    submission=sub,
                    action="account_deactivated",
                    details={"user_id": str(user.id)},
                )

        logout(request)
        return Response(status=204)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True, trim_whitespace=False, max_length=4096
    )
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=4096)


class PasswordChange(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "password"

    @extend_schema(request=PasswordChangeSerializer, responses={204: None})
    def post(self, request):
        values = PasswordChangeSerializer(data=request.data)
        values.is_valid(raise_exception=True)
        if not request.user.check_password(values.validated_data["current_password"]):
            raise serializers.ValidationError(
                {"current_password": ["Mật khẩu hiện tại không đúng."]}
            )
        try:
            validate_password(values.validated_data["new_password"], request.user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        request.user.set_password(values.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response(status=204)


class CreatorProfileSerializer(serializers.ModelSerializer):
    photo_count = serializers.IntegerField(read_only=True)
    joined_at = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta:
        model = User
        fields = ("id", "display_name", "joined_at", "photo_count")


class CreatorDetail(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=CreatorProfileSerializer)
    def get(self, request, pk):
        from apps.photos.models import public_photos

        creator = get_object_or_404(User.objects.filter(is_active=True), pk=pk)
        photos = public_photos().filter(asset__submission__submitted_by=creator)
        data = CreatorProfileSerializer(creator).data
        data["photo_count"] = photos.count()
        return Response(data)


class CreatorPhotos(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from apps.photos.serializers import PublicPhotoSerializer

        return PublicPhotoSerializer

    def get_queryset(self):
        from apps.photos.models import public_photos
        from apps.photos.selectors import photo_queryset

        creator = get_object_or_404(User.objects.filter(is_active=True), pk=self.kwargs["pk"])
        return photo_queryset(
            public_photos().filter(asset__submission__submitted_by=creator)
        ).order_by("-published_at", "id")
