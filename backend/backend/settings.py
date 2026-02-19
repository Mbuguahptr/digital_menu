import os
import sys
import warnings
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# ── SECURITY ──────────────────────────────────────────────────────────────────
_secret = os.environ.get('DJANGO_SECRET')
if not _secret:
    warnings.warn(
        "DJANGO_SECRET is not set. Using an insecure fallback key. "
        "Set DJANGO_SECRET in your environment before deploying to production.",
        stacklevel=1,
    )
    _secret = 'local-dev-insecure-fallback-key-do-not-use-in-production'
SECRET_KEY = _secret

# Default to True locally — Django serves static files automatically with
# correct MIME types. Set DEBUG=False in your Render environment variables.
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ── INSTALLED APPS ────────────────────────────────────────────────────────────
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

# ── MIDDLEWARE ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

# ── TEMPLATES ─────────────────────────────────────────────────────────────────
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'frontend_build'],
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

# ── DATABASE ──────────────────────────────────────────────────────────────────
_db_url = os.environ.get('DATABASE_URL')
if _db_url:
    import dj_database_url
    DATABASES = {'default': dj_database_url.config(default=_db_url, conn_max_age=600)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ── PASSWORD VALIDATION ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── INTERNATIONALISATION ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# ── STATIC FILES ──────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# FIX: Register the assets folder WITH a prefix so files are served at
# /static/assets/filename.js — matching exactly what Vite writes into index.html.
# Without the prefix, Django served them at /static/filename.js (missing /assets/).
_assets_dir = BASE_DIR / 'frontend_build' / 'assets'
if _assets_dir.exists():
    STATICFILES_DIRS = [
        ('assets', _assets_dir),  # serves frontend_build/assets/* at /static/assets/*
    ]
else:
    STATICFILES_DIRS = []

STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# ── MEDIA FILES ───────────────────────────────────────────────────────────────
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── REST FRAMEWORK ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ── SIMPLE JWT ────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ── CORS ──────────────────────────────────────────────────────────────────────
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS')
if _cors_origins:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',')]
else:
    CORS_ALLOW_ALL_ORIGINS = DEBUG

# ── M-PESA ────────────────────────────────────────────────────────────────────
MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', '')
MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', '')
MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '174379')
MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY', '')
MPESA_CALLBACK_URL = os.environ.get(
    'MPESA_CALLBACK_URL',
    'https://your-domain.com/api/mpesa/callback/'
)
MPESA_ENVIRONMENT = os.environ.get('MPESA_ENVIRONMENT', 'sandbox')

# ── JAZZMIN ───────────────────────────────────────────────────────────────────
JAZZMIN_SETTINGS = {
    'site_title': 'Digital Menu Admin',
    'site_header': 'Digital Menu Dashboard',
    'site_brand': 'DIGITAL MENU',
    'welcome_sign': 'Welcome to the Digital Menu Admin',
    'copyright': 'DIGITAL MENU',
    'show_ui_builder': True,
    'navigation_expanded': True,
    'show_sidebar': True,
    'theme': 'darkly',
}

JAZZMIN_UI_TWEAKS = {
    'navbar_small_text': False,
    'footer_small_text': False,
    'body_small_text': True,
    'brand_small_text': False,
    'brand_colour': False,
    'accent': 'accent-success',
    'navbar': 'navbar-success navbar-dark',
    'no_navbar_border': False,
    'navbar_fixed': True,
    'layout_boxed': False,
    'footer_fixed': False,
    'sidebar_fixed': False,
    'sidebar': 'sidebar-dark-primary',
    'sidebar_nav_small_text': False,
    'sidebar_disable_expand': False,
    'sidebar_nav_child_indent': False,
    'sidebar_nav_compact_style': True,
    'sidebar_nav_legacy_style': False,
    'sidebar_nav_flat_style': False,
    'theme': 'darkly',
    'dark_mode_theme': None,
    'button_classes': {
        'default': 'btn btn-primary',
        'delete': 'btn btn-danger',
        'primary': 'btn-primary',
        'secondary': 'btn-secondary',
    },
    'form_view_strong_label': True,
}