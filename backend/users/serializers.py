from rest_framework import serializers
from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'pseudo', 'password', 'type_membre')

    def create(self, validated_data):
        user = CustomUser(**{k: v for k, v in validated_data.items() if k != 'password'})
        user.set_password(validated_data['password'])
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
