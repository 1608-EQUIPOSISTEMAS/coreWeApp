<template>
  <!-- esquina superior derecha -->
  <CToaster placement="top-end" class="p-3">
    <CToast
      v-for="t in toasts"
      :key="t.id"
      :visible="true"
      :autohide="t.autohide"
      :delay="t.duration"
      :color="color(t.type)"
      class="text-white shadow-sm mb-2"
      @hide="remove(t.id)"
    >
      <CToastHeader class="d-none" />
      <CToastBody>
        <div class="fw-semibold">{{ t.title }}</div>
        <div v-if="t.message" class="small opacity-75">{{ t.message }}</div>
      </CToastBody>
    </CToast>
  </CToaster>
</template>

<script setup>
import { useToasts } from '@/composables/useToasts'
const { toasts, remove } = useToasts()
const color = (type) => ({
  success: 'success',
  danger:  'danger',
  warning: 'warning',
  info:    'info'
}[type] || 'secondary')
</script>
