<script setup lang="ts">
const config = useRuntimeConfig()
const { myLayer } = useAppConfig()
</script>

<template>
  <header class="app-header">
    <strong>{{ config.public.appName }}</strong>
    <small>(componente de la layer: {{ myLayer?.name }})</small>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #ddd;
  font-family: system-ui, sans-serif;
}
</style>
