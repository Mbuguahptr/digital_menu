"""
M-Pesa helper utilities.

Previously these were duplicated inline in views.py. Centralised here so
both the views and any management commands/tasks can import from one place.
"""
import base64
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def get_mpesa_base_url():
    env = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
    return (
        'https://api.safaricom.co.ke'
        if env == 'production'
        else 'https://sandbox.safaricom.co.ke'
    )


def generate_password(shortcode: str, passkey: str, timestamp: str) -> str:
    """Return the base64-encoded STK push password."""
    data = f'{shortcode}{passkey}{timestamp}'
    return base64.b64encode(data.encode()).decode()


def get_access_token() -> str | None:
    """
    Fetch an OAuth access token from Safaricom.
    Returns the token string, or None if the request fails.
    """
    consumer_key = getattr(settings, 'MPESA_CONSUMER_KEY', '')
    consumer_secret = getattr(settings, 'MPESA_CONSUMER_SECRET', '')

    if not consumer_key or not consumer_secret:
        logger.error('MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set.')
        return None

    url = f'{get_mpesa_base_url()}/oauth/v1/generate?grant_type=client_credentials'
    try:
        response = requests.get(url, auth=(consumer_key, consumer_secret), timeout=10)
        response.raise_for_status()
        return response.json().get('access_token')
    except requests.RequestException as exc:
        logger.error('Failed to get M-Pesa access token: %s', exc)
        return None