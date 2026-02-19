from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.conf import settings
from .models import Hotel, Product, Category, CanonicalProduct, Booking, Payment
from .serializers import (
    HotelSerializer,
    ProductSerializer,
    CategorySerializer,
    CanonicalProductSerializer,
    BookingSerializer,
)
import csv
import io
import requests
import base64
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)


# ── HELPERS ───────────────────────────────────────────────────────────────────

def normalize_type(value: str):
    if not value:
        return None
    v = value.strip().lower()
    if v in ('room', 'rooms', 'room-type', 'room_types', 'room type'):
        return 'room'
    if v in ('food', 'foods', 'meal', 'meals'):
        return 'food'
    return v


def get_mpesa_base_url():
    env = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
    return (
        'https://api.safaricom.co.ke'
        if env == 'production'
        else 'https://sandbox.safaricom.co.ke'
    )


def get_mpesa_access_token():
    consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
    consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')

    if not consumer_key or not consumer_secret:
        logger.error('M-Pesa consumer key/secret not configured.')
        return None

    url = f'{get_mpesa_base_url()}/oauth/v1/generate?grant_type=client_credentials'
    try:
        response = requests.get(url, auth=(consumer_key, consumer_secret), timeout=10)
        response.raise_for_status()
        return response.json().get('access_token')
    except requests.RequestException as exc:
        logger.error('Failed to get M-Pesa access token: %s', exc)
        return None


# ── HOTEL VIEWSET ─────────────────────────────────────────────────────────────
class HotelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# ── CATEGORY VIEWSET ──────────────────────────────────────────────────────────
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


# ── CANONICAL PRODUCT VIEWSET ─────────────────────────────────────────────────
class CanonicalViewSet(viewsets.ModelViewSet):
    queryset = CanonicalProduct.objects.all()
    serializer_class = CanonicalProductSerializer
    permission_classes = [permissions.IsAuthenticated]


# ── PRODUCT VIEWSET ───────────────────────────────────────────────────────────
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
        # Detail actions (retrieve, update, destroy) use pk directly.
        pk = self.kwargs.get('pk')
        if pk:
            return Product.objects.filter(pk=pk)

        hotel_slug = (
            self.request.query_params.get('hotel')
            or self.request.query_params.get('hotel_slug')
        )
        raw_type = self.request.query_params.get('product_type')
        product_type = normalize_type(raw_type)

        # FIX: return a clear 400 instead of silently returning an empty list
        # when required filters are missing. Handled in list() below.
        if not hotel_slug or not product_type:
            return Product.objects.none()

        return Product.objects.filter(
            hotel__slug__iexact=hotel_slug,
            product_type__iexact=product_type,
            is_archived=False,
        )

    def list(self, request, *args, **kwargs):
        hotel_slug = (
            request.query_params.get('hotel')
            or request.query_params.get('hotel_slug')
        )
        product_type = normalize_type(request.query_params.get('product_type'))

        if not hotel_slug or not product_type:
            return Response(
                {'detail': 'Both hotel_slug and product_type query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        pt = normalize_type(serializer.validated_data.get('product_type'))
        serializer.validated_data['product_type'] = pt
        hotel = serializer.validated_data['hotel']
        # Allow staff/superusers to bypass hotel membership check
        if not (
            self.request.user.is_staff
            or self.request.user.is_superuser
            or hotel.users.filter(user=self.request.user).exists()
        ):
            raise PermissionDenied('You are not a member of that hotel.')
        serializer.save()

    @action(detail=False, methods=['get'], url_path='compare')
    def compare(self, request):
        sku = request.query_params.get('sku')
        name = request.query_params.get('name')

        qs = Product.objects.filter(is_archived=False)

        if sku:
            qs = qs.filter(sku__iexact=sku)
        elif name:
            norm = ''.join(
                e for e in name.lower() if e.isalnum() or e.isspace()
            ).strip()
            qs = qs.filter(normalized_name=norm)
        else:
            return Response(
                {'detail': 'Provide ?sku=... or ?name=...'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProductSerializer(
            qs.select_related('hotel', 'category').order_by('price'),
            many=True,
            context={'request': request},
        )
        return Response(serializer.data)

    @action(
        detail=True, methods=['post'],
        parser_classes=[MultiPartParser],
        url_path='upload_image',
        permission_classes=[permissions.IsAuthenticated],
    )
    def upload_image(self, request, pk=None):
        product = self.get_object()
        file = request.FILES.get('image')
        if not file:
            return Response({'detail': 'image required'}, status=status.HTTP_400_BAD_REQUEST)
        product.image = file
        product.save()
        serializer = self.get_serializer(product)
        return Response({'id': product.id, 'image': serializer.data.get('image')})

    @action(detail=True, methods=['get'], url_path='suggest_links',
            permission_classes=[permissions.IsAuthenticated])
    def suggest_links(self, request, pk=None):
        product = self.get_object()
        candidates = CanonicalProduct.objects.filter(
            normalized_name=product.normalized_name
        )
        serializer = CanonicalProductSerializer(candidates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='link',
            permission_classes=[permissions.IsAuthenticated])
    def link(self, request, pk=None):
        product = self.get_object()
        canonical_id = request.data.get('canonical_id')
        if not canonical_id:
            return Response({'detail': 'canonical_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            canonical = CanonicalProduct.objects.get(pk=canonical_id)
        except CanonicalProduct.DoesNotExist:
            return Response({'detail': 'Canonical product not found.'}, status=status.HTTP_404_NOT_FOUND)
        product.canonical = canonical
        product.save()
        return Response({'detail': 'Linked successfully.'})


# ── CSV UPLOAD ────────────────────────────────────────────────────────────────
class ProductCSVUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {'detail': 'Only staff can upload CSVs.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        f = request.FILES.get('file')
        if not f:
            return Response({'detail': 'file required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = f.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response(
                {'detail': 'File encoding error. Please save the CSV as UTF-8.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(content))
        created, updated, skipped = 0, 0, 0

        for row in reader:
            hotel_slug = (row.get('hotel_slug') or '').strip()
            name = (row.get('name') or '').strip()
            sku = (row.get('sku') or '').strip()

            hotel = Hotel.objects.filter(slug=hotel_slug).first()
            if not hotel or not name:
                skipped += 1
                continue

            try:
                price = Decimal(row.get('price') or 0)
            except InvalidOperation:
                skipped += 1
                continue

            cat = None
            if row.get('category_slug', '').strip():
                cat, _ = Category.objects.get_or_create(
                    slug=row['category_slug'].strip(),
                    defaults={'name': row.get('category', row['category_slug']).strip()},
                )

            # FIX: use update_or_create keyed on (hotel, sku or name) to prevent
            # duplicates when the same CSV is uploaded more than once.
            lookup = {'hotel': hotel, 'sku': sku} if sku else {'hotel': hotel, 'name': name}
            defaults = {
                'name': name,
                'category': cat,
                'description': row.get('description', ''),
                'price': price,
                'currency': row.get('currency', 'KES'),
                'available': row.get('available', 'true').lower() in ('1', 'true', 'yes'),
                'product_type': normalize_type(row.get('product_type', 'room')),
            }
            if sku:
                defaults['sku'] = sku

            _, was_created = Product.objects.update_or_create(defaults=defaults, **lookup)
            if was_created:
                created += 1
            else:
                updated += 1

        return Response({'created': created, 'updated': updated, 'skipped': skipped})


# ── AVAILABILITY CHECK ────────────────────────────────────────────────────────
class AvailabilityCheck(APIView):
    def get(self, request):
        product_id = request.query_params.get('product')
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')

        if not (product_id and check_in and check_out):
            return Response(
                {'detail': 'product, check_in, and check_out are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Overlapping bookings: NOT (check_out <= req_in OR check_in >= req_out)
        overlapping = Booking.objects.filter(
            product_id=product_id,
            status__in=['pending', 'confirmed'],
        ).filter(
            ~(Q(check_out__lte=check_in) | Q(check_in__gte=check_out))
        )

        return Response({'available': not overlapping.exists()})


# ── BOOKINGS ──────────────────────────────────────────────────────────────────
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


# ── M-PESA STK PUSH ───────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mpesa_stk_push(request):
    """
    Initiates an M-Pesa STK push and creates a pending Payment record.
    Expects JSON: { "phone": "2547XXXXXXXX", "amount": 100, "booking_id": <optional> }
    Returns: { "payment_id": ..., "checkout_request_id": ..., "CustomerMessage": ... }
    """
    phone = (request.data.get('phone') or '').strip()
    if not phone:
        return Response({'detail': 'phone is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = int(float(request.data.get('amount', 0)))
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'detail': 'amount must be a positive number.'}, status=status.HTTP_400_BAD_REQUEST)

    booking_id = request.data.get('booking_id')
    booking = None
    if booking_id:
        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            pass

    access_token = get_mpesa_access_token()
    if not access_token:
        return Response(
            {'detail': 'Could not authenticate with M-Pesa. Check server configuration.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = getattr(settings, 'MPESA_SHORTCODE', '')
    passkey = getattr(settings, 'MPESA_PASSKEY', '')
    callback_url = getattr(settings, 'MPESA_CALLBACK_URL', '')

    if not (shortcode and passkey and callback_url):
        return Response(
            {'detail': 'M-Pesa configuration incomplete on server.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    password = base64.b64encode(f'{shortcode}{passkey}{timestamp}'.encode()).decode()

    payload = {
        'BusinessShortCode': shortcode,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': amount,
        'PartyA': phone,
        'PartyB': shortcode,
        'PhoneNumber': phone,
        'CallBackURL': callback_url,
        'AccountReference': 'Booking Payment',
        'TransactionDesc': 'Hotel Booking',
    }

    try:
        stk_url = f'{get_mpesa_base_url()}/mpesa/stkpush/v1/processrequest'
        response = requests.post(
            stk_url, json=payload,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logger.error('M-Pesa STK push failed: %s', exc)
        return Response(
            {'detail': 'M-Pesa request failed.', 'error': str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    # FIX: persist the payment so the callback can look it up and update status.
    payment = Payment.objects.create(
        booking=booking,
        phone=phone,
        amount=amount,
        checkout_request_id=data.get('CheckoutRequestID', ''),
        merchant_request_id=data.get('MerchantRequestID', ''),
        status='pending',
    )

    return Response({
        'payment_id': payment.id,
        'checkout_request_id': payment.checkout_request_id,
        'CustomerMessage': data.get('CustomerMessage', 'Check your phone.'),
    })


# ── M-PESA CALLBACK ───────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mpesa_callback(request):
    """
    Safaricom POSTs the STK push result here.
    Updates the Payment record and confirms the associated Booking.
    """
    try:
        body = request.data.get('Body', {})
        stk = body.get('stkCallback', {})
        result_code = stk.get('ResultCode')
        checkout_request_id = stk.get('CheckoutRequestID', '')

        payment = Payment.objects.filter(
            checkout_request_id=checkout_request_id
        ).first()

        if not payment:
            logger.warning('M-Pesa callback for unknown CheckoutRequestID: %s', checkout_request_id)
            return Response({'status': 'ok'})

        # Store the raw payload for audit/debugging
        payment.raw_callback = request.data

        if result_code == 0:
            # Success — extract receipt from CallbackMetadata
            metadata = stk.get('CallbackMetadata', {}).get('Item', [])
            receipt = next(
                (item['Value'] for item in metadata if item.get('Name') == 'MpesaReceiptNumber'),
                '',
            )
            payment.mpesa_receipt = receipt
            payment.status = 'success'
            payment.save()

            # Confirm the associated booking
            if payment.booking:
                payment.booking.status = 'confirmed'
                payment.booking.save(update_fields=['status'])
                logger.info('Booking %s confirmed via M-Pesa receipt %s', payment.booking.id, receipt)
        else:
            payment.status = 'failed'
            payment.save()
            logger.info(
                'M-Pesa STK callback failed. Code: %s Desc: %s',
                result_code, stk.get('ResultDesc'),
            )

    except Exception as exc:
        logger.exception('Error processing M-Pesa callback: %s', exc)

    # Always return 200 to Safaricom — they retry on non-200 responses.
    return Response({'status': 'received'})


# ── PAYMENT STATUS POLLING ────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def payment_status(request):
    """
    Allows the frontend to poll for payment completion.
    GET /api/payments/status/?payment_id=<id>
    Returns: { "status": "pending"|"success"|"failed"|"cancelled" }
    """
    payment_id = request.query_params.get('payment_id')
    if not payment_id:
        return Response({'detail': 'payment_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = Payment.objects.get(pk=payment_id)
    except Payment.DoesNotExist:
        return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'status': payment.status,
        'mpesa_receipt': payment.mpesa_receipt or None,
    })