from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from .models import Hotel, Category, Product, Booking
from decimal import Decimal

User = get_user_model()

class HotelTests(APITestCase):
    def setUp(self):
        # Create a user and hotel for testing
        self.user = User.objects.create_user(username='testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='test-hotel', city='Test City')

    def test_hotel_list(self):
        url = reverse('hotel-list')  # Adjust this URL based on your routes
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_hotel_create(self):
        url = reverse('hotel-list')  # Adjust this URL based on your routes
        data = {
            'name': 'New Hotel',
            'slug': 'new-hotel',
            'city': 'New City'
        }
        self.client.force_authenticate(user=self.user)  # Authenticate the user
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class CategoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.category = Category.objects.create(name='Test Category', slug='test-category')

    def test_category_list(self):
        url = reverse('category-list')  # Adjust this URL based on your routes
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_category_create(self):
        url = reverse('category-list')  # Adjust this URL based on your routes
        data = {
            'name': 'New Category',
            'slug': 'new-category'
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ProductTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='test-hotel', city='Test City')
        self.category = Category.objects.create(name='Test Category', slug='test-category')
        self.product_data = {
            'hotel': self.hotel.id,
            'name': 'Test Product',
            'sku': 'test-sku',
            'category': self.category.id,
            'description': 'Test Description',
            'price': Decimal('100.00'),
            'currency': 'KES',
            'product_type': 'room',
            'available': True
        }

    def test_product_create(self):
        url = reverse('product-list')  # Adjust this URL based on your routes
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, self.product_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_product_filter_by_type(self):
        # Creating a room and a food product
        self.product_data['product_type'] = 'room'
        self.client.force_authenticate(user=self.user)
        self.client.post(reverse('product-list'), self.product_data, format='json')
        self.product_data['product_type'] = 'food'
        self.client.post(reverse('product-list'), self.product_data, format='json')

        # Filter products by product_type
        url = reverse('product-list') + '?product_type=room'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_product_image_upload(self):
        # Uploading an image
        url = reverse('product-upload_image', args=[1])  # Adjust this URL based on your routes
        with open('test_image.jpg', 'rb') as image:
            response = self.client.post(url, {'image': image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('image' in response.data)


class AvailabilityCheckTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='test-hotel', city='Test City')
        self.product = Product.objects.create(
            hotel=self.hotel, name='Test Room', sku='room-123', price=Decimal('150.00'), available=True, product_type='room'
        )

    def test_availability_check(self):
        url = reverse('availability-check')  # Adjust this URL based on your routes
        response = self.client.get(url, {'product': self.product.id, 'check_in': '2023-12-01', 'check_out': '2023-12-05'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available', response.data)


class BookingTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.hotel = Hotel.objects.create(name='Test Hotel', slug='test-hotel', city='Test City')
        self.product = Product.objects.create(
            hotel=self.hotel, name='Test Room', sku='room-123', price=Decimal('150.00'), available=True, product_type='room'
        )

    def test_booking_create(self):
        url = reverse('booking-list')  # Adjust this URL based on your routes
        data = {
            'product': self.product.id,
            'user': self.user.id,
            'guest_name': 'Test Guest',
            'check_in': '2023-12-01',
            'check_out': '2023-12-05',
            'pax': 2,
            'total_price': Decimal('300.00')
        }
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['guest_name'], 'Test Guest')
