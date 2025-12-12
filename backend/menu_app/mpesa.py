import base64
import requests
from django.utils import timezone

def generate_password(shortcode, passkey, timestamp):
    data = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(data.encode()).decode()

def get_access_token(consumer_key, consumer_secret):
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    response = requests.get(url, auth=(consumer_key, consumer_secret))
    return response.json().get("access_token")
