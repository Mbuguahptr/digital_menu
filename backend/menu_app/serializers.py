from rest_framework import serializers
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
            'extra_meta', 'image'
        ]
        read_only_fields = ['normalized_name', 'available_rooms', 'available']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_canonical(self, obj):
        # Return canonical if it exists (no name filtering)
        if obj.canonical:
            return CanonicalProductSerializer(obj.canonical).data
        return None

    def get_category(self, obj):
        # Return category if it exists (no name filtering)
        if obj.category:
            return CategorySerializer(obj.category).data
        return None



class BookingSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'product', 'product_details', 'user', 'guest_name', 
            'check_in', 'check_out', 'pax', 'total_price', 'status', 'created_at'
        ]
        read_only_fields = ['total_price', 'status', 'created_at']

    def create(self, validated_data):
        product = validated_data['product']

      
        if getattr(product, 'product_type', 'room') == 'room':
            if product.available_rooms <= 0:
                raise serializers.ValidationError("No rooms available for this type.")
            
            product.available_rooms -= 1
            if product.available_rooms == 0:
                product.available = False
            product.save()

        return super().create(validated_data)
