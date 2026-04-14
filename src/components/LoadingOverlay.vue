<template>
  <transition name="bar-fade">
    <div v-if="isLoading" class="top-progress-bar">
      <div class="top-progress-track"></div>
    </div>
  </transition>
</template>

<script setup>
import { loader } from '@/stores/loader'
const isLoading = loader.isLoading
</script>

<style scoped>
.top-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 99999;
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

.bar-fade-enter-active { transition: opacity 0.15s ease; }
.bar-fade-leave-active { transition: opacity 0.3s ease 0.1s; }
.bar-fade-enter-from,
.bar-fade-leave-to   { opacity: 0; }
</style>
