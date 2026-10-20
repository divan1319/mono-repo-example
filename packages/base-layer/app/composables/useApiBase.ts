// Composable compartido: URL base de la API según el runtimeConfig de la app que lo usa.
export function useApiBase() {
  const config = useRuntimeConfig()
  return config.public.apiBase as string
}
