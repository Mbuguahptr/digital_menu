from django.contrib import admin
from django.utils.html import format_html
from .models import Hotel, Product, Category, HotelUser, CanonicalProduct, Booking, Payment


# ── HOTEL ─────────────────────────────────────────────────────────────────────
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
        return 'No Image'
    image_preview.short_description = 'Preview'

    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" style="object-fit:cover;border-radius:4px;" />',
                obj.image.url
            )
        return '-'
    image_tag.short_description = 'Image'


# ── PRODUCT ───────────────────────────────────────────────────────────────────
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'hotel', 'product_type', 'price', 'currency',
        'total_rooms', 'available_rooms', 'available', 'image_tag'
    )
    list_filter = ('hotel', 'category', 'available', 'product_type', 'is_archived')
    search_fields = ('name', 'sku')
    readonly_fields = ('image_preview',)

    fieldsets = (
        (None, {
            'fields': (
                'hotel', 'product_type', 'name', 'sku', 'canonical', 'category',
                'description', 'price', 'currency', 'image', 'image_preview',
                'total_rooms', 'available_rooms', 'available', 'is_archived'
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
            'description', 'price', 'currency', 'image', 'image_preview', 'is_archived'
        ]
        if not obj or obj.product_type == 'room':
            fields += ['total_rooms', 'available_rooms', 'available']
        return fields

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
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

        if db_field.name == 'canonical' and product_type:
            kwargs['queryset'] = CanonicalProduct.objects.filter(
                variants__product_type=product_type
            ).distinct()
        if db_field.name == 'category' and product_type:
            kwargs['queryset'] = Category.objects.filter(
                product__product_type=product_type
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="150" style="object-fit:cover;border-radius:8px;" />',
                obj.image.url
            )
        return 'No Image'
    image_preview.short_description = 'Preview'

    def image_tag(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" width="50" style="object-fit:cover;border-radius:4px;" />',
                obj.image.url
            )
        return '-'
    image_tag.short_description = 'Image'


# ── CATEGORY ──────────────────────────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


# ── CANONICAL PRODUCT ─────────────────────────────────────────────────────────
@admin.register(CanonicalProduct)
class CanonicalProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'normalized_name')
    search_fields = ('name', 'sku')


# ── HOTEL USER ────────────────────────────────────────────────────────────────
# FIX: was registered with bare admin.site.register() — no columns or filters.
@admin.register(HotelUser)
class HotelUserAdmin(admin.ModelAdmin):
    list_display = ('user', 'hotel', 'is_manager', 'created_at')
    list_filter = ('hotel', 'is_manager')
    search_fields = ('user__username', 'user__email', 'hotel__name')
    autocomplete_fields = ('user', 'hotel')


# ── BOOKING ───────────────────────────────────────────────────────────────────
# FIX: was registered with bare admin.site.register() — no useful columns.
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'guest_name', 'user', 'product', 'check_in',
        'check_out', 'total_price', 'status', 'created_at'
    )
    list_filter = ('status', 'product__hotel', 'check_in')
    search_fields = ('guest_name', 'user__username', 'product__name')
    readonly_fields = ('created_at', 'total_price')
    date_hierarchy = 'check_in'

    fieldsets = (
        ('Booking Details', {
            'fields': ('product', 'user', 'guest_name', 'check_in', 'check_out', 'pax')
        }),
        ('Payment & Status', {
            'fields': ('total_price', 'status', 'created_at')
        }),
    )


# ── PAYMENT ───────────────────────────────────────────────────────────────────
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'phone', 'amount', 'status',
        'checkout_request_id', 'mpesa_receipt', 'booking', 'created_at'
    )
    list_filter = ('status',)
    search_fields = ('phone', 'checkout_request_id', 'mpesa_receipt')
    readonly_fields = ('created_at', 'updated_at', 'raw_callback')

    fieldsets = (
        ('Payment Info', {
            'fields': ('booking', 'phone', 'amount', 'status')
        }),
        ('M-Pesa Details', {
            'fields': ('checkout_request_id', 'merchant_request_id', 'mpesa_receipt')
        }),
        ('Audit', {
            'fields': ('raw_callback', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )