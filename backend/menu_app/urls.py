from django.urls import path, include
from rest_framework import routers
from .views import (
    HotelViewSet,
    ProductViewSet,
    CategoryViewSet,
    CanonicalViewSet,
    BookingViewSet,
    ProductCSVUploadView,
    AvailabilityCheck,
    mpesa_stk_push,
    mpesa_callback,
    payment_status,
)

router = routers.DefaultRouter()
router.register(r'hotels', HotelViewSet)
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet)
router.register(r'canonicals', CanonicalViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = router.urls + [
    # CSV import
    path('products/upload-csv/', ProductCSVUploadView.as_view(), name='products-upload-csv'),

    # Room availability check
    path('availability/', AvailabilityCheck.as_view(), name='availability-check'),

    # M-Pesa
    # FIX: removed the duplicate /mpesa/checkout/ route that also pointed at
    # mpesa_stk_push. The frontend components now all call the single canonical URL.
    path('payments/mpesa/stk_push/', mpesa_stk_push, name='mpesa-stk-push'),
    path('payments/mpesa/callback/', mpesa_callback, name='mpesa-callback'),

    # Payment status polling (used by RoomBooking.jsx after STK push)
    path('payments/status/', payment_status, name='payment-status'),
]