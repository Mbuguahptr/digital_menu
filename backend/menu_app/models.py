from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


# ── HOTEL ─────────────────────────────────────────────────────────────────────
class Hotel(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    image = models.ImageField(
        upload_to='hotels/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp'])]
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.city})" if self.city else self.name


# ── CATEGORY ──────────────────────────────────────────────────────────────────
class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


# ── CANONICAL PRODUCT ─────────────────────────────────────────────────────────
class CanonicalProduct(models.Model):
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    normalized_name = models.CharField(max_length=255, blank=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.normalized_name:
            self.normalized_name = ''.join(
                e for e in (self.name or '').lower() if e.isalnum() or e.isspace()
            ).strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ── PRODUCT ───────────────────────────────────────────────────────────────────
class Product(models.Model):
    PRODUCT_TYPE_CHOICES = (
        ('room', 'Room'),
        ('food', 'Food'),
    )

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='products')
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='room')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, db_index=True)
    normalized_name = models.CharField(max_length=255, blank=True, db_index=True)
    canonical = models.ForeignKey(
        CanonicalProduct, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='variants'
    )
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='KES')

    # Room-specific fields
    total_rooms = models.PositiveIntegerField(default=1, null=True, blank=True)
    available_rooms = models.PositiveIntegerField(default=1, null=True, blank=True)
    available = models.BooleanField(default=True)

    image = models.ImageField(
        upload_to='product_images/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'webp'])]
    )
    extra_meta = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['sku']),
        ]

    def save(self, *args, **kwargs):
        # Normalise name
        if not self.normalized_name:
            self.normalized_name = ''.join(
                e for e in self.name.lower() if e.isalnum() or e.isspace()
            ).strip()

        # FIX: only resize the image when it has actually changed.
        # Previously, every save() (including room-decrement saves) opened and
        # re-wrote the image, causing unnecessary I/O and potential corruption.
        _image_changed = False
        if self.pk:
            try:
                old = Product.objects.get(pk=self.pk)
                _image_changed = old.image != self.image
            except Product.DoesNotExist:
                _image_changed = bool(self.image)
        else:
            _image_changed = bool(self.image)

        super().save(*args, **kwargs)

        if _image_changed and self.image:
            try:
                from PIL import Image as PilImage
                img_path = self.image.path
                img = PilImage.open(img_path)
                img.thumbnail((1200, 1200), PilImage.Resampling.LANCZOS)
                img.save(img_path, optimize=True, quality=85)
            except Exception:
                pass  # never break a save due to image processing failure

    def decrease_rooms(self, number=1):
        """Atomically decrement available_rooms using F() to avoid race conditions."""
        if self.product_type != 'room':
            return
        Product.objects.filter(pk=self.pk, available_rooms__gte=number).update(
            available_rooms=models.F('available_rooms') - number
        )
        # Refresh and mark unavailable if sold out
        self.refresh_from_db()
        if self.available_rooms == 0:
            Product.objects.filter(pk=self.pk).update(available=False)
            self.available = False

    def __str__(self):
        return f"{self.name} \u2013 {self.hotel} ({self.product_type})"


# ── HOTEL USER ────────────────────────────────────────────────────────────────
class HotelUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hotel_memberships')
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='users')
    is_manager = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'hotel')

    def __str__(self):
        role = 'Manager' if self.is_manager else 'Staff'
        return f"{self.user} @ {self.hotel} ({role})"


# ── PAYMENT ───────────────────────────────────────────────────────────────────
class Payment(models.Model):
    """Tracks an M-Pesa STK push request and its final outcome."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    booking = models.ForeignKey(
        'Booking', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='payments'
    )
    phone = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    mpesa_receipt = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    raw_callback = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.id} | {self.phone} | {self.status}"


# ── BOOKING ───────────────────────────────────────────────────────────────────
class Booking(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='bookings')
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    guest_name = models.CharField(max_length=200, blank=True)
    check_in = models.DateField()
    check_out = models.DateField()
    pax = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=32, default='pending')

    def save(self, *args, **kwargs):
        # FIX: use `is None` — `not self.total_price` was True for 0, causing
        # recalculation on every save for comp/free bookings.
        if self.product.product_type == 'room' and self.total_price is None:
            nights = (self.check_out - self.check_in).days or 1
            self.total_price = self.product.price * nights
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking {self.id} | {self.guest_name or self.user} | {self.status}"


# ── SIGNAL ────────────────────────────────────────────────────────────────────
# FIX: room decrement is handled HERE via signal only.
# The BookingSerializer.create() previously also decremented, causing a double
# decrement on every booking (room count dropped by 2 instead of 1).
@receiver(post_save, sender=Booking)
def reduce_room_availability(sender, instance, created, **kwargs):
    if created and instance.status == 'pending':
        instance.product.decrease_rooms()