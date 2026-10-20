<script setup lang="ts">
const config = useRuntimeConfig()
const apiBase = useApiBase() // viene de la layer compartida
</script>

<template>
  <main style="padding: 1rem; font-family: system-ui, sans-serif">
    <h1>Backoffice</h1>
    <p>Corre en el puerto 3001 (dominio propio en producción).</p>
    <ul>
      <li>API base: <code>{{ apiBase || '(vacío)' }}</code></li>
      <li><a :href="config.public.webUrl">Ir a la web pública</a></li>
    </ul>
  </main>
</template>
