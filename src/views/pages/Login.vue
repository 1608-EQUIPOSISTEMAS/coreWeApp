<template>
  <div class="page">
    <!-- ══ HERO (LEFT) ══ -->
    <div class="hero">
      <div class="hero-grid"></div>
      <div class="hero-glow"></div>
      <div class="dot dot-1"></div>
      <div class="dot dot-2"></div>
      <div class="dot dot-3"></div>

      <nav class="hero-nav">
        <span class="nav-logo">W|E</span>
        <span class="nav-divider"></span>
        <span class="nav-label">Educación Ejecutiva</span>
      </nav>

      <div class="hero-body">
        <div class="mascot-wrap">
          <div class="mascot-card">
            <div class="mascot-img-box">
              <img src="/images/mascot_valentines.png" alt="WE Mascota">
            </div>
          </div>
        </div>
      </div>

      <div class="hero-foot">
        <p class="quote">"La educación es el arma más poderosa para cambiar el mundo."</p>
        <div class="quote-credit">
          <span class="quote-bar"></span>
          <span class="quote-name">Nelson Mandela</span>
        </div>
      </div>
    </div>

    <!-- ══ FORM (RIGHT) ══ -->
    <div class="form-side">
      <div class="form-box">
        <div class="mobile-brand">
          <img src="/images/logo_we.png" alt="WE" class="mobile-brand-img">
        </div>

        <div class="hdr-badge">
          <span class="hdr-badge-dot"></span>
          <span class="hdr-badge-text">Plataforma activa</span>
        </div>

        <h1 class="hdr-title">Bienvenido de vuelta</h1>
        <p class="hdr-sub">Ingresa tus credenciales para acceder a tu cuenta</p>

        <CForm @submit.prevent="handleLogin" class="login-form">
          <!-- Usuario -->
          <div class="fld">
            <label class="fld-label" for="login-user">Usuario</label>
            <div class="fld-wrap">
              <svg class="fld-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="login-user"
                v-model="credentials.username"
                class="fld-input"
                type="text"
                placeholder="Ingresa tu usuario"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <!-- Contraseña -->
          <div class="fld">
            <label class="fld-label" for="login-pass">Contraseña</label>
            <div class="fld-wrap">
              <svg class="fld-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="login-pass"
                v-model="credentials.password"
                class="fld-input fld-input--pass"
                :type="showPass ? 'text' : 'password'"
                placeholder="Ingresa tu contraseña"
                autocomplete="current-password"
                required
              />
              <button type="button" class="fld-toggle" @click="showPass = !showPass" tabindex="-1">
                <svg v-if="!showPass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Error -->
          <transition name="err-anim">
            <div v-if="errorMsg" class="err">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ errorMsg }}</span>
            </div>
          </transition>

          <!-- Button -->
          <button type="submit" class="btn-go" :disabled="loading">
            <template v-if="!loading">
              Ingresar
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </template>
            <template v-else>
              <span class="spinner"></span>
              Ingresando...
            </template>
          </button>
        </CForm>

        <div class="ftr">
          <p>W|E Educación Ejecutiva &copy; {{ currentYear }}</p>
        </div>
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
    async handleLogin() {
      this.loading = true
      this.errorMsg = ''
      try {
        await this.authService.login(this.credentials)
        this.toast.success('¡Bienvenido!')
        this.router.push({ name: 'Dashboard' })
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
      this.router.push({ name: 'Dashboard' })
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ══════════════════════════════════════
   RESET
   ══════════════════════════════════════ */
*,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; }

/* ══════════════════════════════════════
   LAYOUT
   ══════════════════════════════════════ */
.page {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #051538;
}

/* ══════════════════════════════════════
   HERO (LEFT)
   ══════════════════════════════════════ */
.hero {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #051538;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 56px 56px;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  width: 520px;
  height: 520px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(217,4,41,0.1) 0%, transparent 70%);
  filter: blur(40px);
  animation: glowPulse 6s ease-in-out infinite;
  pointer-events: none;
}

.dot { position: absolute; border-radius: 50%; z-index: 1; }
.dot-1 { width: 5px; height: 5px; background: rgba(217,4,41,0.25); top: 18%; right: 18%; animation: drift 7s ease-in-out infinite; }
.dot-2 { width: 3px; height: 3px; background: rgba(255,255,255,0.06); top: 60%; left: 14%; animation: drift 9s ease-in-out infinite 2s; }
.dot-3 { width: 6px; height: 6px; background: rgba(217,4,41,0.12); bottom: 28%; right: 22%; animation: drift 8s ease-in-out infinite 1s; }

.hero-nav {
  padding: 32px 36px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 2;
  animation: enterUp 0.6s ease both;
}

.nav-logo { font-size: 1.5rem; font-weight: 800; color: #fff; letter-spacing: 3px; }
.nav-divider { width: 1px; height: 20px; background: rgba(255,255,255,0.12); }
.nav-label { font-size: 0.65rem; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 2.5px; font-weight: 600; }

.hero-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  padding: 20px;
  animation: enterUp 0.7s ease 0.1s both;
}

.mascot-wrap { position: relative; width: 310px; height: 310px; }

.mascot-card {
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.07);
  padding: 14px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
}

.mascot-img-box {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.mascot-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-foot {
  padding: 0 36px 36px;
  z-index: 2;
  animation: enterUp 0.7s ease 0.2s both;
}

.quote { font-size: 1.05rem; color: rgba(255,255,255,0.5); line-height: 1.65; font-style: italic; max-width: 400px; }
.quote-credit { margin-top: 12px; display: flex; align-items: center; gap: 10px; }
.quote-bar { width: 24px; height: 2px; background: #d90429; border-radius: 2px; }
.quote-name { font-size: 0.7rem; color: rgba(255,255,255,0.28); letter-spacing: 2px; text-transform: uppercase; font-weight: 600; }

/* ══════════════════════════════════════
   FORM PANEL (RIGHT)
   ══════════════════════════════════════ */
.form-side {
  width: 500px;
  min-width: 500px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 52px;
  position: relative;
}

.form-side::after {
  content: '';
  position: absolute;
  left: 0; top: 8%; bottom: 8%;
  width: 1px;
  background: linear-gradient(to bottom, transparent, #e2e8f0 30%, #e2e8f0 70%, transparent);
}

.form-box {
  width: 100%;
  max-width: 360px;
  animation: enterRight 0.5s ease 0.15s both;
}

.mobile-brand { display: none; text-align: center; margin-bottom: 28px; }
.mobile-brand-img { height: 44px; object-fit: contain; }

.hdr-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px 5px 10px;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 100px;
  margin-bottom: 24px;
}

.hdr-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
  animation: blink 2s ease-in-out infinite;
}

.hdr-badge-text {
  font-size: 0.7rem;
  color: #16a34a;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.hdr-title {
  font-size: 1.95rem;
  font-weight: 800;
  color: #051538;
  line-height: 1.2;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.hdr-sub {
  font-size: 0.88rem;
  color: #94a3b8;
  font-weight: 400;
  line-height: 1.5;
}

/* ══════════════════════════════════════
   FORM FIELDS
   ══════════════════════════════════════
   NOTA: Se usa !important en propiedades
   clave para vencer los estilos globales
   de style.scss que aplican a input[type]
   ══════════════════════════════════════ */
.login-form {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.fld {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.fld-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  letter-spacing: 0.15px;
}

.fld-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 50px !important;
}

/* ── Icono a la izquierda ── */
.fld-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
  transition: color 0.2s;
  z-index: 2;
  flex-shrink: 0;
}

/* ── Input ── */
.fld-input {
  width: 100% !important;
  height: 50px !important;
  min-height: 50px !important;
  max-height: 50px !important;
  padding: 0 16px 0 44px !important;
  border: 1.5px solid #e2e8f0 !important;
  border-left: 1.5px solid #e2e8f0 !important;
  border-radius: 12px !important;
  background: #fff !important;
  background-color: #fff !important;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif !important;
  font-size: 0.88rem !important;
  color: #0f172a !important;
  outline: none !important;
  transition: border-color 0.2s, box-shadow 0.2s !important;
  display: block;
  box-sizing: border-box !important;
  box-shadow: none !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.fld-input--pass {
  padding-right: 48px !important;
}

.fld-input::placeholder {
  color: #cbd5e1 !important;
  opacity: 1 !important;
}

.fld-input:hover {
  border-color: #cbd5e1 !important;
}

.fld-input:focus {
  border-color: #051538 !important;
  border-left-color: #051538 !important;
  box-shadow: 0 0 0 3px rgba(5,21,56,0.06) !important;
  background: #fff !important;
  background-color: #fff !important;
}

/* Icono cambia color con focus del input */
.fld-wrap:focus-within .fld-ico {
  color: #051538;
}

/* ── Anular estilos de validación globales ── */
.fld-input:required:invalid,
.fld-input:required:valid,
.fld-input:required:invalid:focus,
.fld-input:required:valid:focus {
  border-left: 1.5px solid #e2e8f0 !important;
  padding-left: 44px !important;
}

.fld-input:required:invalid:focus,
.fld-input:required:valid:focus {
  border-color: #051538 !important;
  border-left-color: #051538 !important;
  box-shadow: 0 0 0 3px rgba(5,21,56,0.06) !important;
}

.fld-input:required:not(:disabled):placeholder-shown {
  border-left: 1.5px solid #e2e8f0 !important;
}

/* ── Toggle password ── */
.fld-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.15s;
  z-index: 2;
}

.fld-toggle:hover {
  background: #f1f5f9;
  color: #334155;
}

/* Error */
.err {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 500;
}

.err svg { flex-shrink: 0; }

/* Button */
.btn-go {
  width: 100%;
  height: 50px;
  margin-top: 6px;
  border: none;
  border-radius: 12px;
  background: #d90429;
  color: #fff;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-go:hover:not(:disabled) {
  background: #ef233c;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(217,4,41,0.3), 0 2px 6px rgba(217,4,41,0.12);
}

.btn-go:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 10px rgba(217,4,41,0.2);
}

.btn-go:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-go svg { transition: transform 0.2s; }
.btn-go:hover svg { transform: translateX(3px); }

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Footer */
.ftr {
  margin-top: 44px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.ftr p {
  font-size: 0.7rem;
  color: #cbd5e1;
  letter-spacing: 0.5px;
}

/* ══════════════════════════════════════
   KEYFRAMES
   ══════════════════════════════════════ */
@keyframes glowPulse {
  0%,100% { opacity: .5; transform: translate(-50%,-50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%,-50%) scale(1.08); }
}

@keyframes drift {
  0%,100% { transform: translate(0,0); opacity: .3; }
  50% { transform: translate(12px,-16px); opacity: .7; }
}

@keyframes blink {
  0%,100% { opacity: 1; }
  50% { opacity: .3; }
}

@keyframes enterUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes enterRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.err-anim-enter-active { animation: shakeIn 0.4s ease; }
.err-anim-leave-active { transition: opacity 0.2s; }
.err-anim-enter-from, .err-anim-leave-to { opacity: 0; }

@keyframes shakeIn {
  0% { opacity: 0; }
  20% { opacity: 1; transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

/* ══════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════ */
@media (max-width: 1024px) {
  .form-side { width: 440px; min-width: 440px; padding: 40px 36px; }
  .mascot-wrap { width: 260px; height: 260px; }
}

@media (max-width: 768px) {
  .page { flex-direction: column; }

  .hero {
    flex: none;
    min-height: 300px;
    align-items: center;
    justify-content: center;
  }

  .hero-nav {
    position: absolute;
    top: 0; left: 0; right: 0;
    padding: 20px 24px;
  }

  .hero-foot { display: none; }
  .mascot-wrap { width: 170px; height: 170px; }
  .mascot-card { padding: 10px; border-radius: 20px; }
  .mascot-img-box { border-radius: 13px; }

  .form-side {
    width: 100%;
    min-width: unset;
    border-radius: 24px 24px 0 0;
    margin-top: -24px;
    z-index: 3;
    box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
    padding: 32px 24px;
  }

  .form-side::after { display: none; }
  .form-box { max-width: 400px; }
  .mobile-brand { display: block; }
  .hdr-title { font-size: 1.6rem; }
}

@media (max-width: 480px) {
  .hero { min-height: 250px; }
  .mascot-wrap { width: 140px; height: 140px; }
  .nav-label, .nav-divider { display: none; }
  .nav-logo { font-size: 1.2rem; }
  .form-side { padding: 28px 20px; }
  .hdr-title { font-size: 1.4rem; }
  .fld-input { border-radius: 10px !important; }
  .fld-wrap { height: 46px !important; }
  .fld-input { height: 46px !important; min-height: 46px !important; max-height: 46px !important; }
  .btn-go { height: 46px; border-radius: 10px; }
}
</style>