from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.conf import settings
from .models import Hotel, Product, Category, CanonicalProduct, Booking
from .serializers import (
    HotelSerializer,
    ProductSerializer,
    CategorySerializer,
    CanonicalProductSerializer,
    BookingSerializer
)
import csv, io, requests, base64
from datetime import datetime
from decimal import Decimal


# HELPERS

def normalize_type(value: str):
    if not value:
        return None
    v = value.strip().lower()
    if v in ["room", "rooms", "room-type", "room_types", "room type"]:
        return "room"
    if v in ["food", "foods", "meal", "meals"]:
        return "food"
    return v



# HOTEL VIEWSET
class HotelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# CATEGORY VIEWSET
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]



# CANONICAL PRODUCT VIEWSET
class CanonicalViewSet(viewsets.ModelViewSet):
    queryset = CanonicalProduct.objects.all()
    serializer_class = CanonicalProductSerializer
    permission_classes = [permissions.IsAuthenticated]


# PRODUCT VIEWSET
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'normalized_name', 'sku']
    ordering_fields = ['price', 'name']

    def get_serializer(self, *args, **kwargs):
        kwargs['context'] = self.get_serializer_context()
        return super().get_serializer(*args, **kwargs)

    def get_queryset(self):
        pk = self.kwargs.get('pk')
        if pk:
            return Product.objects.filter(pk=pk)

        hotel_slug = (
            self.request.query_params.get('hotel') or
            self.request.query_params.get('hotel_slug')
        )
        raw_type = self.request.query_params.get('product_type')
        product_type = normalize_type(raw_type)

        # If neither hotel_slug nor product_type present, return empty to avoid mixing types
        if not hotel_slug or not product_type:
            return Product.objects.none()

        return Product.objects.filter(
            hotel__slug__iexact=hotel_slug,
            product_type__iexact=product_type,
            is_archived=False
        )

    def perform_create(self, serializer):
        pt = normalize_type(serializer.validated_data.get("product_type"))
        serializer.validated_data["product_type"] = pt

        hotel = serializer.validated_data['hotel']
        if not hotel.users.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of that hotel.")
        serializer.save()

    @action(detail=False, methods=['get'], url_path='compare')
    def compare(self, request):
        sku = request.query_params.get('sku')
        name = request.query_params.get('name')

        qs = Product.objects.filter(is_archived=False)

        if sku:
            qs = qs.filter(sku__iexact=sku)
        elif name:
            norm = ''.join(e for e in name.lower() if e.isalnum() or e.isspace()).strip()
            qs = qs.filter(normalized_name=norm)
        else:
            return Response({"detail": "Provide ?sku=... or ?name=..."}, status=400)

        serializer = ProductSerializer(
            qs.select_related('hotel', 'category').order_by('price'),
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser], url_path='upload_image')
    def upload_image(self, request, pk=None):
        product = self.get_object()
        file = request.FILES.get('image')
        if not file:
            return Response({'detail': 'image required'}, status=400)
        product.image = file
        product.save()
        return Response({'id': product.id, 'image': product.image.url})


# CSV UPLOAD
class ProductCSVUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        f = request.FILES.get('file')
        if not f:
            return Response({'detail': 'file required'}, status=400)

        content = f.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(content))

        created, skipped = 0, 0

        for row in reader:
            hotel = Hotel.objects.filter(slug=row['hotel_slug']).first()
            if not hotel:
                skipped += 1
                continue

            cat = None
            if row.get('category_slug'):
                cat, _ = Category.objects.get_or_create(
                    slug=row['category_slug'],
                    defaults={'name': row.get('category', row['category_slug'])}
                )

            Product.objects.create(
                hotel=hotel,
                name=row.get('name', ''),
                sku=row.get('sku', ''),
                category=cat,
                description=row.get('description'),
                price=Decimal(row.get('price') or 0),
                currency=row.get('currency', 'KES'),
                available=row.get('available', 'true').lower() in ('1', 'true', 'yes'),
                product_type=normalize_type(row.get('product_type', 'room'))
            )
            created += 1

        return Response({'created': created, 'skipped': skipped})


# AVAILABILITY CHECK
class AvailabilityCheck(APIView):
    def get(self, request):
        product_id = request.query_params.get('product')
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')

        if not (product_id and check_in and check_out):
            return Response({'detail': 'Missing fields'}, status=400)

        qs = Booking.objects.filter(
            product_id=product_id,
            status__in=['pending', 'confirmed']
        ).filter(~(Q(check_out__lte=check_in) | Q(check_in__gte=check_out)))

        return Response({'available': not qs.exists()})



# BOOKINGS
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Booking.objects.filter(
                Q(user=user) | Q(product__hotel__users__user=user)
            ).distinct()
        return Booking.objects.none()

    def perform_create(self, serializer):
        serializer.save()


# M-PESA REAL INTEGRATION
def get_mpesa_access_token():
    consumer_key = getattr(settings, "MPESA_CONSUMER_KEY", None)
    consumer_secret = getattr(settings, "MPESA_CONSUMER_SECRET", None)

    if not consumer_key or not consumer_secret:
        return None

    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        response = requests.get(url, auth=(consumer_key, consumer_secret), timeout=10)
        response.raise_for_status()
        return response.json().get("access_token")
    except requests.RequestException:
        return None


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mpesa_stk_push(request):
    """
    REAL M-PESA STK PUSH (sandbox)
    Expects JSON: { "phone": "2547XXXXXXXX", "amount": 100 }
    """
    phone = request.data.get('phone')
    try:
        amount = int(request.data.get('amount', 1))
    except (ValueError, TypeError):
        return Response({"detail": "Invalid amount"}, status=400)

    if not phone:
        return Response({"detail": "phone required"}, status=400)

    access_token = get_mpesa_access_token()
    if not access_token:
        return Response({"detail": "Could not get access token"}, status=500)

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

    shortcode = getattr(settings, "MPESA_SHORTCODE", None)
    passkey = getattr(settings, "MPESA_PASSKEY", None)
    callback_url = getattr(settings, "MPESA_CALLBACK_URL", None)

    if not (shortcode and passkey and callback_url):
        return Response({"detail": "M-Pesa configuration incomplete"}, status=500)

    data_to_encode = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(data_to_encode.encode()).decode()

    stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": "Booking Payment",
        "TransactionDesc": "Hotel Booking"
    }

    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.post(stk_url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return Response(response.json())
    except requests.RequestException as exc:
        # Return useful info for debugging
        return Response({"detail": "M-Pesa request failed", "error": str(exc)}, status=502)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mpesa_callback(request):
    """
    M-Pesa will POST the transaction result here.
    Save/verify transaction here as needed.
    """
    # Minimal placeholder: log to console (or better: save to DB)
    try:
        # Request body structure varies; keep raw payload for now
        payload = request.data
        # Example: you can inspect payload['Body']['stkCallback'] for result
        print("M-PESA CALLBACK RECEIVED:", payload)
    except Exception as e:
        print("Error processing callback:", e)

    return Response({"status": "received"})
