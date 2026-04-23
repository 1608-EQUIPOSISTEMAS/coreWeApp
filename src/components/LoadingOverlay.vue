<template>
  <transition name="overlay-fade">
    <div v-if="isLoading" class="loading-overlay">
      <div class="top-progress-bar">
        <div class="top-progress-track"></div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { loader } from '@/stores/loader'
const isLoading = loader.isLoading
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  background: rgba(255, 255, 255, 0.25);
  pointer-events: all;
}

.top-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  overflow: hidden;
}

.top-progress-track {
  height: 100%;
  width: 100%;
  background: linear-gradient(
    90deg,
    #0d9488 0%,
    #14b8a6 30%,
    #5eead4 50%,
    #14b8a6 70%,
    #0d9488 100%
  );
  background-size: 200% 100%;
  animation: progress-slide 1.2s ease-in-out infinite;
}

@keyframes progress-slide {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.overlay-fade-enter-active { transition: opacity 0.2s ease; }
.overlay-fade-leave-active { transition: opacity 0.3s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to    { opacity: 0; }
</style>
