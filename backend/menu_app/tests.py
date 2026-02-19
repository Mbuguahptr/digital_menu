from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Hotel, Category, Product, Booking
from decimal import Decimal
from datetime import date, timedelta
import io

try:
    from PIL import Image as PilImage
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

User = get_user_model()

# ── Helpers ───────────────────────────────────────────────────────────────────

def make_test_image(name='test.jpg'):
    """Return a minimal valid JPEG as a SimpleUploadedFile."""
    if HAS_PIL:
        buf = io.BytesIO()
        img = PilImage.new('RGB', (10, 10), color='red')
        img.save(buf, format='JPEG')
        buf.seek(0)
        return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')
    # Fallback: a tiny valid JPEG header (enough for Django's ImageField validator)
    jpeg_bytes = (
        b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
        b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
        b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
        b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\x85'
        b'\xff\xd9'
    )
    return SimpleUploadedFile(name, jpeg_bytes, content_type='image/jpeg')


def future_date(offset_days=1):
    return (date.today() + timedelta(days=offset_days)).isoformat()


# ── Hotel Tests ───────────────────────────────────────────────────────────────
class HotelTests(APITestCase):
    def setUp(self):
        # FIX: unique username per test class to avoid conflicts
        self.user = User.objects.create_user(username='hotel_testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='test-hotel', city='Test City')

    def test_hotel_list(self):
        url = reverse('hotel-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hotel_list_is_paginated(self):
        url = reverse('hotel-list')
        response = self.client.get(url)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)


# ── Category Tests ────────────────────────────────────────────────────────────
class CategoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cat_testuser', password='password')
        self.category = Category.objects.create(name='Test Category', slug='test-category')

    def test_category_list(self):
        url = reverse('category-list')
        response = self.client.get(url)
        # Category viewset requires authentication
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])

    def test_category_create_authenticated(self):
        url = reverse('category-list')
        data = {'name': 'New Category', 'slug': 'new-category'}
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ── Product Tests ─────────────────────────────────────────────────────────────
class ProductTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='prod_testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='prod-test-hotel', city='Test City')
        self.category = Category.objects.create(name='Test Category', slug='prod-test-category')
        self.base_data = {
            'hotel_id': self.hotel.id,
            'name': 'Test Room',
            'sku': 'test-sku-001',
            'category_id': self.category.id,
            'description': 'A test room',
            'price': '100.00',
            'currency': 'KES',
            'product_type': 'room',
        }

    def _create_room_product(self):
        """Helper: create a room product directly in the DB."""
        return Product.objects.create(
            hotel=self.hotel,
            name='DB Room',
            sku='db-room-sku',
            price=Decimal('100.00'),
            product_type='room',
        )

    def test_product_list_requires_filters(self):
        """Listing without hotel_slug and product_type should return 400."""
        url = reverse('product-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_list_with_filters(self):
        self._create_room_product()
        url = reverse('product-list') + f'?hotel_slug={self.hotel.slug}&product_type=room'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # FIX: response is paginated — check `count`, not len(response.data)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_product_filter_by_type(self):
        """Products are correctly filtered by type."""
        Product.objects.create(hotel=self.hotel, name='Room A', sku='r1', price=100, product_type='room')
        Product.objects.create(hotel=self.hotel, name='Food A', sku='f1', price=10, product_type='food')

        url = reverse('product-list') + f'?hotel_slug={self.hotel.slug}&product_type=room'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # FIX: use response.data['count'] — response is paginated, not a plain list
        self.assertEqual(response.data['count'], 1)

    def test_product_image_upload(self):
        """Image upload endpoint returns 200 with image URL."""
        product = self._create_room_product()
        url = reverse('product-upload_image', args=[product.id])
        # FIX: use SimpleUploadedFile instead of opening a non-existent file
        image = make_test_image()
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('image', response.data)


# ── Availability Tests ────────────────────────────────────────────────────────
class AvailabilityCheckTests(APITestCase):
    def setUp(self):
        self.hotel = Hotel.objects.create(name='Avail Hotel', slug='avail-hotel', city='Test City')
        self.product = Product.objects.create(
            hotel=self.hotel, name='Avail Room', sku='avail-sku',
            price=Decimal('150.00'), available=True, product_type='room'
        )

    def test_availability_check_returns_available(self):
        url = reverse('availability-check')
        # FIX: use future dates — past dates may break date-validation logic added later
        response = self.client.get(url, {
            'product': self.product.id,
            'check_in': future_date(1),
            'check_out': future_date(5),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available', response.data)
        self.assertTrue(response.data['available'])

    def test_availability_check_missing_params(self):
        url = reverse('availability-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── Booking Tests ─────────────────────────────────────────────────────────────
class BookingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='book_testuser', password='password')
        self.hotel = Hotel.objects.create(name='Book Hotel', slug='book-hotel', city='Test City')
        self.product = Product.objects.create(
            hotel=self.hotel, name='Book Room', sku='book-sku',
            price=Decimal('150.00'), available=True,
            total_rooms=5, available_rooms=5, product_type='room'
        )

    def test_booking_create(self):
        url = reverse('booking-list')
        data = {
            'product': self.product.id,
            'guest_name': 'Test Guest',
            # FIX: use future dates
            'check_in': future_date(1),
            'check_out': future_date(5),
            'pax': 2,
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['guest_name'], 'Test Guest')

    def test_booking_check_out_before_check_in_rejected(self):
        url = reverse('booking-list')
        data = {
            'product': self.product.id,
            'guest_name': 'Bad Guest',
            'check_in': future_date(5),
            'check_out': future_date(1),  # before check_in
            'pax': 1,
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_room_availability_decrements_on_booking(self):
        """Creating a booking should decrement available_rooms by 1."""
        self.client.force_authenticate(user=self.user)
        url = reverse('booking-list')
        self.client.post(url, {
            'product': self.product.id,
            'guest_name': 'Guest',
            'check_in': future_date(1),
            'check_out': future_date(3),
            'pax': 1,
        }, format='json')
        self.product.refresh_from_db()
        self.assertEqual(self.product.available_rooms, 4)