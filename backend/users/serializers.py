import uuid
from rest_framework import serializers
from .models import CustomUser, LoginHistory, LEVEL_CHOICES


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'pseudo', 'password', 'type_membre')

    def create(self, validated_data):
        user = CustomUser(**{k: v for k, v in validated_data.items() if k != 'password'})
        user.set_password(validated_data['password'])
        user.verification_token = str(uuid.uuid4())
        user.save()
        return user


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'pseudo', 'age', 'genre', 'type_membre', 'photo', 'level', 'points')
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'pseudo', 'age', 'genre', 'date_naissance',
            'type_membre', 'photo', 'level', 'points', 'login_count', 'action_count',
        )
        read_only_fields = ('id', 'email', 'level', 'points', 'login_count', 'action_count')


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'pseudo', 'age', 'genre', 'date_naissance', 'type_membre', 'photo',
            'is_verified', 'is_active',
            'points', 'level', 'login_count', 'action_count',
            'date_joined', 'last_login',
        )
        read_only_fields = (
            'id', 'points', 'level', 'login_count', 'action_count',
            'date_joined', 'last_login', 'is_verified',
        )


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('email', 'first_name', 'last_name', 'type_membre', 'is_active')
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'type_membre': {'required': False},
            'is_active': {'required': False},
        }


class AdminSetLevelSerializer(serializers.Serializer):
    level = serializers.ChoiceField(choices=[c[0] for c in LEVEL_CHOICES])


class AdminSetPointsSerializer(serializers.Serializer):
    points = serializers.FloatField(min_value=0)
