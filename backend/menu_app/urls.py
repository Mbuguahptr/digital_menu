from django.urls import path, include
from rest_framework import routers
from .views import HotelViewSet, ProductViewSet, CategoryViewSet, CanonicalViewSet, ProductCSVUploadView, BookingViewSet, AvailabilityCheck, mpesa_stk_push
router = routers.DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet)
router.register(r'canonicals', CanonicalViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')
urlpatterns = router.urls + [
    path('products/upload-csv/', ProductCSVUploadView.as_view(), name='products-upload-csv'),
    path('availability/', AvailabilityCheck.as_view(), name='availability'),
    path('payments/mpesa/stk_push/', mpesa_stk_push, name='mpesa-stk'),
    path("mpesa/checkout/", mpesa_stk_push),
]
