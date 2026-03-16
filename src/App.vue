<script setup>
  import { onBeforeMount, onMounted, onUnmounted  } from 'vue'
  import { useColorModes } from '@coreui/vue'
  import { useRouter } from 'vue-router'  // añadir
  import { useThemeStore } from '@/stores/theme.js'
  import LoadingOverlay from '@/components/LoadingOverlay.vue'


  const { isColorModeSet, setColorMode } = useColorModes(
    'coreui-free-vue-admin-template-theme',
  )
  const currentTheme = useThemeStore()
  const router = useRouter()  // añadir

  onBeforeMount(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    let theme = urlParams.get('theme')

    if (theme !== null && theme.match(/^[A-Za-z0-9\s]+/)) {
      theme = theme.match(/^[A-Za-z0-9\s]+/)[0]
    }

    if (theme) {
      setColorMode(theme)
      return
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(currentTheme.theme)
  })

  // ── Restricciones actualizadas por SSE ───────────────────────
  function handleRestrictionsUpdated() {
    router.push({ name: 'ComercialLeads' }).then(() => window.location.reload())
  }

  onMounted(() => {
    window.addEventListener('crm:restrictions-updated', handleRestrictionsUpdated)
  })

  onUnmounted(() => {
    window.removeEventListener('crm:restrictions-updated', handleRestrictionsUpdated)
  })
</script>

<template>
  <router-view />
  <LoadingOverlay />  <!-- SIEMPRE presente -->
</template>

<style lang="scss">
// Import Main styles for this application
@use 'styles/style';
// We use those styles to show code examples, you should remove them in your application.
@use 'styles/examples';
</style>
