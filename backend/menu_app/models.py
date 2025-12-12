from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from PIL import Image
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


# HOTEL
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
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])]
    )

    def __str__(self):
        return f"{self.name} ({self.city})" if self.city else self.name


# CATEGORY
class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


# CANONICAL PRODUCT
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


# PRODUCT (Room or Food)
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
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png'])]
    )
    extra_meta = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['sku']),
        ]

    def save(self, *args, **kwargs):
        if not self.normalized_name:
            self.normalized_name = ''.join(
                e for e in self.name.lower() if e.isalnum() or e.isspace()
            ).strip()
        super().save(*args, **kwargs)

        # Resize image safely
        if self.image:
            img_path = self.image.path
            img = Image.open(img_path)
            max_size = (1200, 1200)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            img.save(img_path, optimize=True, quality=85)

    def decrease_rooms(self, number=1):
        if self.product_type != 'room':
            return
        if self.available_rooms >= number:
            self.available_rooms -= number
            if self.available_rooms == 0:
                self.available = False
            self.save()

    def __str__(self):
        return f"{self.name} — {self.hotel} ({self.product_type})"


# HOTEL USER
class HotelUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hotel_memberships')
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='users')
    is_manager = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'hotel')


# BOOKING (only for rooms)
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
        # Only calculate price for rooms
        if self.product.product_type == 'room' and not self.total_price:
            nights = (self.check_out - self.check_in).days or 1
            self.total_price = self.product.price * nights
        super().save(*args, **kwargs)


# SIGNAL: Reduce room availability when a new booking is created
@receiver(post_save, sender=Booking)
def reduce_room_availability(sender, instance, created, **kwargs):
    if created and instance.status == "pending":
        instance.product.decrease_rooms()
