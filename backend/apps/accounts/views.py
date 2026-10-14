from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import serializers
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
    display_name = serializers.CharField(max_length=100)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email đã được sử dụng.")
        return value

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], User(email=attrs["email"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=4096)


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
        except IntegrityError:
            raise serializers.ValidationError({"email": ["Email đã được sử dụng."]})
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(ProfileSerializer(user).data, status=201)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses=ProfileSerializer)
    def post(self, request):
        if settings.DEBUG and not request.data.get("email") and not request.data.get("password"):
            user, _ = User.objects.get_or_create(
                email="debug-user@demo.invalid",
                defaults={"display_name": "Người dùng DEBUG", "password": make_password(None)},
            )
            if not user.is_active or user.is_staff or user.is_superuser:
                raise serializers.ValidationError("Tài khoản DEBUG không khả dụng.")
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return Response(ProfileSerializer(user).data)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if not user:
            raise serializers.ValidationError({"email": ["Email hoặc mật khẩu không đúng."]})
        login(request, user)
        return Response(ProfileSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        logout(request)
        return Response(status=204)


class ProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=100)


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
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        request.user.set_password(values.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)
        return Response(status=204)
