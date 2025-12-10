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

        <CCol :md="5" :lg="4" class="d-flex align-items-center bg-white shadow-lg position-relative">
          <div class="w-100 p-4 p-lg-5">
            <CForm @submit.prevent="handleLogin">
              
              <div class="mb-5">
                <h1 class="fw-bold mb-2">Iniciar Sesión</h1>
                <p class="text-body-secondary">
                  Ingresa tus credenciales para acceder.
                </p>
              </div>

              <CInputGroup class="mb-3">
                <CInputGroupText class="bg-light border-end-0">
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

              <CInputGroup class="mb-4">
                <CInputGroupText class="bg-light border-end-0">
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
                  class="fw-bold text-white py-2"
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
  
  // 1. CORRECCIÓN: Usamos setup() para inicializar hooks de composición
  setup() {
    const toast = useToast()
    const router = useRouter()
    
    // Inyectamos el servicio aquí dentro
    const authService = inject(ServiceKeys.Auth)

    // Retornamos estas variables para poder usarlas en 'methods' usando 'this.'
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

        // 2. USO: Ahora accedemos vía 'this.authService' gracias al return del setup
        const response = await this.authService.login(this.credentials);
        
        // Asumiendo que tu servicio devuelve { token, user } o similar
        // Aquí guardarías el token, ej: localStorage.setItem('token', response.token)

        this.toast.success('¡Bienvenido!');
        
        this.router.push({ name: 'Dashboard' });

        
        
      } catch (error) {
        console.error('Error en login:', error);
        
        const mensaje = error.response?.data?.message || 'Credenciales incorrectas';
        this.toast.error(mensaje);
        this.errorMsg = mensaje; // Por si quieres mostrarlo en texto rojo en el form

      } finally {
        this.loading = false;
      }
    },
    
  },

  mounted() {
    // Verificamos si ya está autenticado usando el servicio inyectado
    if(this.authService && this.authService.isAuthenticated && this.authService.isAuthenticated()){
        this.router.push({ name: 'Dashboard' });
    }

    // Ajuste de velocidad del video
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

/* 1. El video en sí */
.video-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* IMPORTANTE: Esto recorta el video para llenar el espacio sin deformarse */
  z-index: 0;
}

/* 2. La capa oscura encima del video */
.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* AJUSTE MANUAL: Cambia el 0.4 para más o menos oscuridad (0.0 a 1.0) */
  background: rgba(0, 0, 0, 0.4); 
  z-index: 1;
}

/* 3. Contenedor del texto sobre el video */
.content-on-video {
  z-index: 2; /* Debe ser mayor que el overlay */
  text-shadow: 0 2px 4px rgba(0,0,0,0.5); /* Sombra para mejor lectura */
}

/* =========================================
   ESTILOS DEL FORMULARIO
   ========================================= */
.form-control:focus, .input-group-text {
  box-shadow: none;
  border-color: #dee2e6;
}

/* Efecto visual al hacer foco en los inputs */
.input-group:focus-within .form-control,
.input-group:focus-within .input-group-text {
  border-color: #321fdb; /* Color primario de CoreUI */
  background-color: #fff !important;
}

.input-group-text {
  color: #768192;
}
</style>