<template>
  <div class="min-vh-100 d-flex flex-row align-items-stretch">
    <CContainer fluid class="p-0">
      <CRow class="g-0 min-vh-100">
        
        <CCol :md="7" :lg="8" class="d-none d-md-flex position-relative overflow-hidden align-items-center justify-content-center bg-dark">
          <video autoplay muted loop playsinline class="video-background">
            <source :src="videoSrc" type="video/mp4">
            Tu navegador no soporta videos HTML5.
          </video>
          <div class="video-overlay"></div>
          <div class="position-relative text-white text-center p-5 content-on-video">
            <h2 class="display-4 fw-bold mb-3">¡Felices Fiestas!</h2>
            <p class="lead fs-4">Bienvenido al sistema de gestión.</p>
          </div>
        </CCol>

        <CCol :md="5" :lg="4" class="d-flex align-items-center shadow-lg position-relative striped-blue-bg">
          <div class="w-100 p-4 p-lg-5">
            <CForm @submit.prevent="handleLogin">
              
              <div class="mb-5 text-white">
                <h1 class="fw-bold mb-2">Iniciar Sesión</h1>
                <p class="text-white-50">
                  Ingresa tus credenciales para acceder.
                </p>
              </div>

              <CInputGroup class="mb-3 custom-input-group">
                <CInputGroupText class="bg-light border-end-0 text-secondary">
                  <CIcon icon="cil-user" />
                </CInputGroupText>
                <CFormInput
                  v-model="credentials.username"
                  placeholder="Usuario"
                  autocomplete="username"
                  class="bg-light border-start-0 py-2"
                  required
                />
              </CInputGroup>

              <CInputGroup class="mb-4 custom-input-group">
                <CInputGroupText class="bg-light border-end-0 text-secondary">
                  <CIcon icon="cil-lock-locked" />
                </CInputGroupText>
                <CFormInput
                  v-model="credentials.password"
                  type="password"
                  placeholder="Contraseña"
                  autocomplete="current-password"
                  class="bg-light border-start-0 py-2"
                  required
                />
              </CInputGroup>

              <div class="d-grid gap-2 mb-3">
                <CButton 
                  color="primary" 
                  size="lg"
                  type="submit"
                  :disabled="loading"
                  class="fw-bold text-white py-2 shadow-sm"
                >
                  <span v-if="!loading">Ingresar</span>
                  <span v-else>
                    <CSpinner component="span" size="sm" aria-hidden="true"/> Cargando...
                  </span>
                </CButton>
              </div>

            </CForm>
          </div>
        </CCol>

      </CRow>
    </CContainer>
  </div>
</template>

<script>
import navidadesVideo from '@/assets/videos/Video_de_Navidad_Alegre.mp4'
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

export default {
  name: 'Login',
  setup() {
    const toast = useToast()
    const router = useRouter()
    const authService = inject(ServiceKeys.Auth)

    return {
      toast,
      router,
      authService
    }
  },
  data() {
    return {
      videoSrc: navidadesVideo,
      credentials: {
        username: '', 
        password: ''
      },
      loading: false,
      errorMsg: ''
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      this.errorMsg = '';
      try {
        console.log('Intentando login...', this.credentials);
        await this.authService.login(this.credentials);
        this.toast.success('¡Bienvenido!');
        this.router.push({ name: 'Dashboard' });
      } catch (error) {
        console.error('Error en login:', error);
        const mensaje = error.response?.data?.message || 'Credenciales incorrectas';
        this.toast.error(mensaje);
        this.errorMsg = mensaje;
      } finally {
        this.loading = false;
      }
    },
  },
  mounted() {
    if(this.authService && this.authService.isAuthenticated && this.authService.isAuthenticated()){
        this.router.push({ name: 'Dashboard' });
    }
    const videoElement = document.querySelector('video');
    if(videoElement) {
        videoElement.playbackRate = 1.0; 
    }
  }
}
</script>

<style scoped>
/* =========================================
   ESTILOS PARA EL VIDEO DE FONDO
   ========================================= */
.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4); 
  z-index: 1;
}
.content-on-video {
  z-index: 2;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* =========================================
   ESTILOS NUEVOS: FONDO AZUL RAYADO
   ========================================= */
.striped-blue-bg {
  /* Color base azul oscuro */
  background-color: #0d1b2a; 
  /* Patrón de rayas diagonales */
  background-image: repeating-linear-gradient(
    45deg,
    #102a43,
    #102a43 10px,
    #0d1b2a 10px,
    #0d1b2a 20px
  );
  color: #fff; /* Texto blanco por defecto */
}

/* =========================================
   ESTILOS DEL FORMULARIO Y INPUTS
   ========================================= */
/* Forzar que el grupo de input sea una fila y no se rompa */
.custom-input-group {
  display: flex;
  flex-wrap: nowrap; /* Esto evita que el icono se vaya arriba */
  align-items: stretch;
}

/* Ajustes visuales para que parezcan una sola caja */
.form-control, .input-group-text {
  border-color: #ced4da;
}

.form-control:focus, .input-group-text {
  box-shadow: none;
  border-color: #dee2e6;
}

/* Efecto focus mejorado: Ilumina todo el grupo */
.input-group:focus-within .form-control,
.input-group:focus-within .input-group-text {
  border-color: #4f5d75; /* Un azul grisáceo para el borde al hacer click */
  background-color: #fff !important;
}

.input-group-text {
  display: flex; /* Centrar el icono */
  align-items: center;
  justify-content: center;
  min-width: 50px; /* Asegura un ancho mínimo para el icono */
}
</style>