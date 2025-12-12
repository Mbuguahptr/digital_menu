from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve as static_serve
import os

urlpatterns = [
    path('admin/', admin.site.urls),

    # API routes
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include('menu_app.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# -------------------------------
# FRONTEND (React) SERVING
# -------------------------------

# Path to index.html inside frontend_build
index_file = os.path.join(settings.BASE_DIR, "frontend_build", "index.html")

if os.path.exists(index_file):
    # Serve the React index.html for any non-API route
    urlpatterns += [
        re_path(r"^(?!api/|admin/).*", TemplateView.as_view(template_name="index.html")),
    ]
