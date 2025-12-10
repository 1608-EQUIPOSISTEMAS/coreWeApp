<template>
  <transition name="fade">
    <div v-if="isLoading" class="overlay">
      <div class="panel">
        <!-- Tu logo opcional -->
        <!-- <img class="logo" src="@/assets/logo.svg" alt="logo" /> -->
        <div class="spinner" aria-label="Cargando"></div>
        <div class="msg">Cargando…</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { loader } from '@/stores/loader'
const isLoading = loader.isLoading
</script>

<style scoped>
.overlay{
  position: fixed; inset: 0; z-index: 20000;
  background: rgba(0,0,0,.35);          /* oscurecer */
  display: grid; place-items: center;
  backdrop-filter: blur(1px);
}
.panel{
  background: #fff; border-radius: 12px; padding: 18px 22px;
  box-shadow: 0 10px 25px rgba(0,0,0,.15);
  display: flex; align-items: center; gap: 12px;
}
.logo{ height: 28px; }
.msg{ font-weight: 600; color: #111827; }

.spinner, .spinner::after{
  box-sizing: border-box;
}
.spinner{
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid #e5e7eb; border-top-color: #3b82f6;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active{ transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to{ opacity: 0; }
</style>
