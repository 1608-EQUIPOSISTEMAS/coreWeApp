<template>
  <div class="page">
    <!-- background layers -->
    <div class="bg-gradient"></div>
    <div class="bg-grid"></div>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <!-- sparky: fondo translúcido abajo-izquierda -->
    <img src="/images/mascot_valentines.png" alt="" class="sparky" aria-hidden="true">

    <!-- ══ HERO (LEFT) ══ -->
    <div class="hero">
      <div class="hero-nav">
        <div class="nav-logo">
          <span>W</span>
          <span class="nav-logo-bar"></span>
          <span>E</span>
        </div>
        <div class="nav-label">EDUCACIÓN<br>EJECUTIVA</div>
      </div>

      <div class="hero-body">
        <div class="hero-badge">
          <span class="hero-badge-dot"></span>
          Plataforma administrativa
        </div>
        <h1 class="hero-title">Bienvenido a tu <span class="hero-title-accent">espacio de trabajo.</span></h1>
        <p class="hero-sub">Todo lo que necesitas para tu día, en un solo lugar. Inicia sesión para comenzar.</p>
      </div>

      <div class="hero-foot">Sistema ERP interno · Uso exclusivo del personal</div>
    </div>

    <!-- ══ FORM (RIGHT) ══ -->
    <div class="form-side">
      <div class="card">
        <div class="card-hdr">
          <h2 class="card-title">Bienvenido de nuevo</h2>
          <p class="card-sub">Ingresa tus credenciales para continuar.</p>
        </div>

        <CForm @submit.prevent="handleLogin" novalidate>
          <div class="fld">
            <label class="fld-label" for="login-user">Correo o usuario</label>
            <input
              id="login-user"
              v-model="credentials.username"
              class="fld-input"
              type="text"
              placeholder="tu@correo.com"
              autocomplete="username"
              required
            />
          </div>

          <div class="fld">
            <label class="fld-label" for="login-pass">Contraseña</label>
            <div class="fld-wrap">
              <input
                id="login-pass"
                v-model="credentials.password"
                class="fld-input fld-input--pass"
                :type="showPass ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="fld-toggle" @click="showPass = !showPass" tabindex="-1">
                {{ showPass ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <button type="submit" class="btn-go" :disabled="loading">
            <template v-if="!loading">Iniciar sesión</template>
            <template v-else><span class="spinner"></span> Ingresando...</template>
          </button>

          <transition name="err-anim">
            <div v-if="errorMsg" class="err">{{ errorMsg }}</div>
          </transition>
        </CForm>

        <div class="ftr">W|E Educación Ejecutiva &copy; {{ currentYear }}</div>
      </div>
    </div>
  </div>
</template>

<script>
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
    return { toast, router, authService }
  },
  data() {
    return {
      credentials: { username: '', password: '' },
      loading: false,
      errorMsg: '',
      showPass: false,
      currentYear: new Date().getFullYear()
    }
  },
  methods: {
    // Destino post-login: ADMIN aterriza en el Dashboard; cualquier otro rol
    // va directo al cronograma de solo lectura (pedido del 17/07).
    homeRoute() {
      try {
        const roles = JSON.parse(localStorage.getItem('user') || '{}').roles || []
        return roles.includes('ADMIN')
          ? { name: 'Dashboard' }
          : { name: 'ScheduleBoard' }
      } catch {
        return { name: 'Dashboard' }
      }
    },
    async handleLogin() {
      this.loading = true
      this.errorMsg = ''
      try {
        await this.authService.login(this.credentials)
        this.toast.success('¡Bienvenido!')
        this.router.push(this.homeRoute())
      } catch (error) {
        const mensaje = error.response?.data?.message || 'Credenciales incorrectas'
        this.toast.error(mensaje)
        this.errorMsg = mensaje
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    if (this.authService?.isAuthenticated?.()) {
      this.router.push(this.homeRoute())
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap');

*,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; }

/* ══ LAYOUT ══ */
.page {
  min-height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  position: relative;
  overflow: hidden;
  background: #05052e;
  font-family: 'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ══ BACKGROUND ══ */
.bg-gradient {
  position: absolute; inset: 0;
  background:
    radial-gradient(90% 80% at 12% 8%, rgba(58,58,180,0.35), transparent 55%),
    radial-gradient(70% 70% at 95% 100%, rgba(20,20,110,0.6), transparent 60%),
    linear-gradient(135deg, #0b0b52 0%, #06062f 100%);
}

.bg-grid {
  position: absolute; inset: 0;
  opacity: 0.4;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 64px 64px;
}

.orb { position: absolute; pointer-events: none; }
.orb-1 {
  top: 14%; left: 58%; width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(120,120,255,0.28), transparent 70%);
  filter: blur(6px);
  animation: drift1 14s ease-in-out infinite;
}
.orb-2 {
  bottom: 10%; left: 8%; width: 160px; height: 160px; border-radius: 34px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.02);
  transform: rotate(18deg);
  animation: drift2 18s ease-in-out infinite;
}
.orb-3 {
  top: 30%; left: 20%; width: 90px; height: 90px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(111,224,168,0.22), transparent 70%);
  filter: blur(4px);
  animation: drift3 11s ease-in-out infinite;
}

/* ══ SPARKY (fondo translúcido, abajo-izquierda) ══ */
.sparky {
  position: absolute;
  left: -40px;
  bottom: -50px;
  width: 420px;
  opacity: 0.16;
  transform: scaleX(-1); /* la imagen original mira a la izquierda; volteada mira a la derecha */
  pointer-events: none;
  user-select: none;
  z-index: 1;
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 45% 45%, #000 35%, transparent 78%);
  mask-image: radial-gradient(ellipse 70% 70% at 45% 45%, #000 35%, transparent 78%);
}

/* ══ HERO (LEFT) ══ */
.hero {
  position: relative;
  z-index: 2;
  color: #fff;
  padding: 60px 72px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  animation: floatRise 0.7s ease both;
}

.hero-nav { display: flex; align-items: center; gap: 16px; }

.nav-logo {
  display: flex; align-items: center; gap: 9px;
  font-weight: 900; font-size: 38px; letter-spacing: -0.03em; line-height: 1;
}
.nav-logo-bar {
  width: 3px; height: 38px; border-radius: 2px; display: inline-block;
  background: linear-gradient(180deg, #fff, rgba(255,255,255,0.4));
}
.nav-label { font-size: 10px; font-weight: 700; letter-spacing: 0.26em; line-height: 1.35; opacity: 0.75; }

.hero-body { max-width: 520px; }

.hero-badge {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 7px 14px;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 100px;
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.8);
  margin-bottom: 30px;
  background: rgba(255,255,255,0.03);
}
.hero-badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #6fe0a8; box-shadow: 0 0 10px #6fe0a8;
}

.hero-title {
  font-family: 'Fraunces', serif;
  font-size: 58px; line-height: 1.04; font-weight: 400; letter-spacing: -0.015em;
  margin-bottom: 24px;
}
.hero-title-accent { font-style: italic; color: #b9b9ff; }

.hero-sub { font-size: 17px; line-height: 1.65; color: rgba(255,255,255,0.62); max-width: 440px; }

.hero-foot { font-size: 13px; color: rgba(255,255,255,0.45); }

/* ══ FORM (RIGHT) ══ */
.form-side {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
}

.card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 22px;
  padding: 44px 42px;
  box-shadow: 0 30px 70px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
  animation: floatRise 0.7s ease 0.1s both;
}

.card-hdr { margin-bottom: 34px; }
.card-title {
  font-family: 'Fraunces', serif;
  font-size: 32px; font-weight: 500; letter-spacing: -0.01em;
  color: #0b0b52; margin-bottom: 8px;
}
.card-sub { font-size: 14.5px; color: #6b6b78; }

/* ══ FIELDS (con !important para vencer style.scss global) ══ */
.fld { margin-bottom: 20px; }

.fld-label {
  display: block;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.03em;
  color: #3a3a4a; margin-bottom: 8px; text-transform: uppercase;
}

.fld-wrap { position: relative; }

.fld-input {
  width: 100% !important;
  padding: 14px 15px !important;
  font-family: inherit !important;
  font-size: 15px !important;
  color: #12124d !important;
  background: #f7f7fb !important;
  background-color: #f7f7fb !important;
  border: 1.5px solid #e6e6ee !important;
  border-radius: 12px !important;
  outline: none !important;
  box-shadow: none !important;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s !important;
  -webkit-appearance: none;
  appearance: none;
}

.fld-input--pass { padding-right: 92px !important; }

.fld-input::placeholder { color: #b0b0bd !important; opacity: 1 !important; }

.fld-input:focus {
  border-color: #0b0b52 !important;
  box-shadow: 0 0 0 3px rgba(11,11,82,0.08) !important;
  background: #fff !important;
  background-color: #fff !important;
}

.fld-input:required:invalid,
.fld-input:required:valid {
  border: 1.5px solid #e6e6ee !important;
}
.fld-input:required:invalid:focus,
.fld-input:required:valid:focus {
  border-color: #0b0b52 !important;
}

.fld-toggle {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  font-family: inherit;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
  color: #0b0b52; padding: 6px 8px; border-radius: 6px; text-transform: uppercase;
}
.fld-toggle:hover { background: #f1f1f7; }

/* ══ BUTTON ══ */
.btn-go {
  width: 100%;
  padding: 16px;
  margin-top: 8px;
  background: #0b0b52;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 15px; font-weight: 700; letter-spacing: 0.02em;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: transform 0.12s, box-shadow 0.2s, background 0.2s;
  box-shadow: 0 10px 24px -8px rgba(11,11,82,0.6);
}
.btn-go:hover:not(:disabled) {
  background: #16167a;
  transform: translateY(-1px);
  box-shadow: 0 16px 30px -10px rgba(11,11,82,0.7);
}
.btn-go:active:not(:disabled) { transform: translateY(0); }
.btn-go:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* ══ ERROR ══ */
.err {
  margin-top: 18px;
  padding: 12px 14px;
  background: #fdeeec;
  border: 1px solid #f4c9c2;
  border-radius: 10px;
  font-size: 13px; color: #a5352a; font-weight: 500;
}

.err-anim-enter-active { animation: shakeIn 0.4s ease; }
.err-anim-leave-active { transition: opacity 0.2s; }
.err-anim-enter-from, .err-anim-leave-to { opacity: 0; }

/* ══ FOOTER ══ */
.ftr {
  margin-top: 30px;
  text-align: center;
  font-size: 13px;
  color: #8a8a96;
}

/* ══ KEYFRAMES ══ */
@keyframes floatRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes drift1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(24px,-30px) rotate(8deg); } }
@keyframes drift2 { 0%,100% { transform: translate(0,0) rotate(18deg); } 50% { transform: translate(-28px,22px) rotate(12deg); } }
@keyframes drift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px,26px); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shakeIn {
  0% { opacity: 0; }
  20% { opacity: 1; transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

/* ══ RESPONSIVE ══ */
@media (max-width: 900px) {
  .page { grid-template-columns: 1fr; }
  .hero { padding: 40px 32px; gap: 28px; min-height: unset; }
  .hero-title { font-size: 38px; }
  .hero-foot { display: none; }
  .form-side { padding: 0 24px 48px; }
  .sparky { width: 300px; left: -50px; bottom: -40px; opacity: 0.12; }
}

@media (max-width: 480px) {
  .hero { padding: 32px 22px; }
  .hero-title { font-size: 30px; }
  .hero-sub { font-size: 15px; }
  .card { padding: 34px 26px; border-radius: 18px; }
}
</style>
