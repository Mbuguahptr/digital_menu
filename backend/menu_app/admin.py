from django.contrib import admin
from django.utils.html import format_html
from .models import Hotel, Product, Category, HotelUser, CanonicalProduct, Booking

# HOTEL ADMIN 
@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'slug', 'image_tag')
    search_fields = ('name', 'slug', 'city')
    list_filter = ('city',)
    
    readonly_fields = ('image_preview',)

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'address', 'city', 'timezone', 'image', 'image_preview')
        }),
    )

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="150" style="object-fit:cover;border-radius:8px;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = 'Preview'

    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" style="object-fit:cover;border-radius:4px;" />',
                obj.image.url
            )
        return "-"
    image_tag.short_description = 'Image'


# PRODUCT ADMIN (ROOM + FOOD)
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'hotel', 'product_type', 'price', 'currency',
        'total_rooms', 'available_rooms', 'available', 'image_tag'
    )
    list_filter = ('hotel', 'category', 'available', 'product_type')
    search_fields = ('name', 'sku')

    readonly_fields = ('image_preview',)

    fieldsets = (
        (None, {
            'fields': (
                'hotel', 'product_type', 'name', 'sku', 'canonical', 'category',
                'description', 'price', 'currency', 'image', 'image_preview',
                'total_rooms', 'available_rooms', 'available'
            )
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
    
        if obj and obj.product_type == 'food':
            readonly += ['total_rooms', 'available_rooms', 'available']
        return readonly

    def get_fields(self, request, obj=None):
        fields = [
            'hotel', 'product_type', 'name', 'sku', 'canonical', 'category',
            'description', 'price', 'currency', 'image', 'image_preview'
        ]
        if not obj or obj.product_type == 'room':
            fields += ['total_rooms', 'available_rooms', 'available']
        return fields

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """
        Filter Canonical and Category options based on product_type.
        Works for both adding and editing.
        """
        product_type = None

        
        obj_id = request.resolver_match.kwargs.get('object_id')
        if obj_id:
            try:
                product = Product.objects.get(pk=obj_id)
                product_type = product.product_type
            except Product.DoesNotExist:
                pass
        
        elif request.GET.get('product_type'):
            product_type = request.GET.get('product_type')

        if db_field.name == "canonical" and product_type:
            kwargs["queryset"] = CanonicalProduct.objects.filter(
                variants__product_type=product_type
            ).distinct()
        if db_field.name == "category" and product_type:
            kwargs["queryset"] = Category.objects.filter(
                product__product_type=product_type
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="150" style="object-fit:cover;border-radius:8px;" />',
                obj.image.url
            )
        return "No Image"
    image_preview.short_description = 'Preview'

    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" style="object-fit:cover;border-radius:4px;" />',
                obj.image.url
            )
        return "-"
    image_tag.short_description = 'Image'


# OTHER MODELS 
admin.site.register(Category)
admin.site.register(HotelUser)
admin.site.register(CanonicalProduct)
admin.site.register(Booking)
