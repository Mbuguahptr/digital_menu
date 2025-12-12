import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET', 'dev-secret')
DEBUG = True
ALLOWED_HOSTS = ['*']


INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'menu_app',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ]
    },
}]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),  # Use "Authorization: Bearer <token>
}


CORS_ALLOW_ALL_ORIGINS = True

# M-PESA CONFIG 
# Sandbox credentials (replace with live ones for production)
MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY", "your_sandbox_consumer_key")
MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET", "your_sandbox_consumer_secret")

# Safaricom Daraja Shortcode (Paybill)
MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "174379")  # Sandbox default
MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "your_sandbox_passkey")
MPESA_CALLBACK_URL = os.environ.get(
    "MPESA_CALLBACK_URL",
    "https://your-domain.com/api/mpesa/callback/"  # Update when deploying
)

# Optional: sandbox vs live
MPESA_ENVIRONMENT = os.environ.get("MPESA_ENVIRONMENT", "sandbox")  # "live" for production

JAZZMIN_SETTINGS = {
    "site_title": "Digital Menu Review Admin",
    "site_header": "Digital MENU Dashboard",
    "site_brand": "DIGITAL MENU",
    "welcome_sign": "Welcome to the Digital Menu Admin",
    "copyright": "DIGITAL MENU",

   
    "show_ui_builder": True,



    "navigation_expanded": True,
    "show_sidebar": True,
    "theme": "darkly",  
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": True,
    "brand_small_text": False,
    "brand_colour": False,
    "accent": "accent-success",
    "navbar": "navbar-success navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": False,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": True,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "darkly",
    "dark_mode_theme": None,
    "button_classes": {
        "default": "btn btn-primary",
        "delete": "btn btn-danger",
        "primary": "btn-primary",
        "secondary": "btn-secondary"
    },
    "form_view_strong_label": True
}