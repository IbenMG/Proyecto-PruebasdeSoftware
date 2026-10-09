"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView
from api.views import RegistroView, LoginCorreoView, MisCampaniasView

from api.views import UsuarioCreateView, UsuarioListView, UsuarioRetrieveUpdateView, UsuarioDestroyView
from api.views import CampaniaCreateView, CampaniaListView, CampaniaRetrieveUpdateView, CampaniaDestroyView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('rest_framework.urls')),

    path('api/token/', LoginCorreoView.as_view(), name='token_obtain_pair'),
    path('api/token', LoginCorreoView.as_view(), name='token_obtain_pair_legacy'),
    path('api/token/refresh', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/usuarios/create/', UsuarioCreateView.as_view(), name='usuario-create'),
    path('api/usuarios/', UsuarioListView.as_view(), name='usuario-list'),
    path('api/usuarios/<int:pk>/', UsuarioRetrieveUpdateView.as_view(), name='usuario-detail'),
    path('api/usuarios/<int:pk>/delete/', UsuarioDestroyView.as_view(), name='usuario-delete'),

    path('api/campanias/create/', CampaniaCreateView.as_view(), name='campania-create'),
    path('api/campanias/mis/', MisCampaniasView.as_view(), name='mis-campanias'),
    path('api/campanias/', CampaniaListView.as_view(), name='campania-list'),
    path('api/campanias/<int:pk>/', CampaniaRetrieveUpdateView.as_view(), name='campania-detail'),
    path('api/campanias/<int:pk>/delete/', CampaniaDestroyView.as_view(), name='campania-delete'),
    path('api/registro/', RegistroView.as_view(), name='registro'),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
