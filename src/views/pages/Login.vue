<template>
  <div class="min-vh-100 d-flex flex-row align-items-stretch">
    <CContainer fluid class="p-0">
      <CRow class="g-0 min-vh-100">
        
        <CCol :md="7" :lg="8" class="d-none d-md-flex position-relative overflow-hidden align-items-center justify-content-center bg-dark">
          <img :src="bgImage" alt="Fondo Amistad" class="img-background">
          <div class="img-overlay"></div>
          
        </CCol>

        <CCol :md="5" :lg="4" class="d-flex align-items-center shadow-lg position-relative theme-blue-bg">
          <div class="w-100 p-4 p-lg-5">
            <CForm @submit.prevent="handleLogin">
              
              <div class="mb-4 text-center">
                 <img src="/images/logo_we.png" alt="WE Educación Ejecutiva" class="img-fluid mb-4 logo-login">
              </div>

              <div class="mb-4 text-white">
                <h3 class="fw-bold mb-1">Bienvenido</h3>
                <p class="text-white-50 fs-6">
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
                  color="danger" 
                  size="lg"
                  type="submit"
                  :disabled="loading"
                  class="fw-bold text-white py-2 shadow-sm btn-rosas"
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
import { inject } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

// NOTA: Ya no importamos la imagen aquí porque está en 'public'
// Vite sirve todo lo que está en 'public' en la raíz '/'.

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
      // Ruta absoluta desde la raíz del servidor (carpeta public)
      bgImage: '/images/friendship_bg.png', 
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
  }
}
</script>

<style scoped>
/* =========================================
   ESTILOS LOGO
   ========================================= */
.logo-login {
  max-height: 80px; /* Ajusta este tamaño según prefieras */
  object-fit: contain;
}

/* =========================================
   ESTILOS PARA LA IMAGEN DE FONDO
   ========================================= */
.img-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}

.img-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.content-on-image {
  z-index: 2;
  text-shadow: 0 4px 8px rgba(0,0,0,0.8);
}

/* =========================================
   ESTILOS FONDO DERECHO
   ========================================= */
.theme-blue-bg {
  background-color: #051538; 
  color: #fff;
  border-left: 1px solid rgba(255,255,255,0.1);
}

/* =========================================
   BOTÓN PERSONALIZADO (ROJO ROSA)
   ========================================= */
.btn-rosas {
  background-color: #d90429; 
  border-color: #d90429;
  transition: all 0.3s ease;
}
.btn-rosas:hover {
  background-color: #ef233c;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(217, 4, 41, 0.4) !important;
}

/* =========================================
   ESTILOS DEL FORMULARIO
   ========================================= */
.custom-input-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
}

.form-control, .input-group-text {
  border-color: #ced4da;
}

.form-control:focus, .input-group-text {
  box-shadow: none;
  border-color: #dee2e6;
}

.input-group:focus-within .form-control,
.input-group:focus-within .input-group-text {
  border-color: #ef233c;
  background-color: #fff !important;
}

.input-group-text {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
}
</style>