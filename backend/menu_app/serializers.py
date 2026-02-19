from rest_framework import serializers
from django.db import transaction
from .models import Hotel, Product, Category, CanonicalProduct, Booking


class HotelSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = ['id', 'name', 'slug', 'address', 'city', 'timezone', 'image']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class CanonicalProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanonicalProduct
        fields = ['id', 'name', 'sku', 'normalized_name']


class ProductSerializer(serializers.ModelSerializer):
    hotel = HotelSerializer(read_only=True)
    hotel_slug = serializers.CharField(source='hotel.slug', read_only=True)
    hotel_id = serializers.PrimaryKeyRelatedField(
        source='hotel',
        queryset=Hotel.objects.all(),
        write_only=True
    )
    canonical = serializers.SerializerMethodField()
    canonical_id = serializers.PrimaryKeyRelatedField(
        source='canonical',
        queryset=CanonicalProduct.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    category = serializers.SerializerMethodField()
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'hotel', 'hotel_slug', 'hotel_id',
            'name', 'sku', 'normalized_name',
            'canonical', 'canonical_id',
            'category', 'category_id',
            'description', 'price',
            'currency', 'product_type',
            'total_rooms', 'available_rooms', 'available',
            'extra_meta', 'image',
        ]
        read_only_fields = ['normalized_name', 'available_rooms', 'available']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_canonical(self, obj):
        if obj.canonical:
            return CanonicalProductSerializer(obj.canonical).data
        return None

    def get_category(self, obj):
        if obj.category:
            return CategorySerializer(obj.category).data
        return None


class BookingSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'product', 'product_details', 'user', 'guest_name',
            'check_in', 'check_out', 'pax', 'total_price', 'status', 'created_at',
        ]
        read_only_fields = ['total_price', 'status', 'created_at']

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError("check_out must be after check_in.")
        return data

    def create(self, validated_data):
        product = validated_data['product']

        # FIX: removed the manual available_rooms decrement that was here.
        # The post_save signal on Booking already calls product.decrease_rooms(),
        # so having both caused a double-decrement (room count dropped by 2).
        # Availability is now checked here only — decrement happens in the signal.
        if product.product_type == 'room':
            # FIX: use select_for_update inside a transaction to prevent two
            # concurrent requests from both seeing available_rooms=1 and
            # each creating a booking for the last room.
            with transaction.atomic():
                locked_product = (
                    Product.objects.select_for_update().get(pk=product.pk)
                )
                if locked_product.available_rooms is not None and locked_product.available_rooms <= 0:
                    raise serializers.ValidationError(
                        "No rooms available for this type."
                    )
                return super().create(validated_data)

        return super().create(validated_data)