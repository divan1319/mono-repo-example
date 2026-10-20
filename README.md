# nuxt-dos-apps

Monorepo de ejemplo con **dos apps Nuxt 4 independientes** (cada una en su dominio) y una **layer compartida**.
Los tres proyectos se generaron con el CLI oficial (`nuxi init`) y luego se adaptaron.

```
nuxt-dos-apps/
├── package.json              # scripts de la raíz
├── pnpm-workspace.yaml
├── apps/
│   ├── web/                  # puerto 3000 (SSR)
│   └── backoffice/           # puerto 3001 (SPA, ssr: false)
└── packages/
    └── base-layer/           # layer compartida (template "layer" de Nuxt)
```

## Cómo se creó (para repetirlo desde cero)

```bash
mkdir mi-proyecto && cd mi-proyecto
mkdir apps packages

# 1) Las apps: proyectos Nuxt normales
npx nuxi@latest init apps/web        --template minimal --packageManager pnpm --no-install --gitInit=false
npx nuxi@latest init apps/backoffice --template minimal --packageManager pnpm --no-install --gitInit=false

# 2) La layer compartida
npx nuxi@latest init packages/base-layer --template layer --packageManager pnpm --no-install --gitInit=false
```

Luego, a mano:

1. Crear `pnpm-workspace.yaml` en la raíz con `apps/*` y `packages/*`, y un `package.json` raíz con los scripts.
2. En cada app: agregar `"base-layer": "workspace:*"` en `devDependencies` y `extends: ['base-layer']` en `nuxt.config.ts`.
3. Fijar un puerto por app en el script `dev` (`nuxt dev --port 3000 --strictPort`).
4. En la layer: agregar `"private": true` y `"postinstall": "nuxt prepare .playground"`.

## Requisitos

- Node.js (versión que pida Nuxt 4; verifica en la documentación actual)
- pnpm 10 (`corepack enable`; toma la versión de `packageManager`)

## Uso

```bash
pnpm install

# Las dos apps a la vez
pnpm dev
#   web        -> http://localhost:3000
#   backoffice -> http://localhost:3001

# Una sola
pnpm dev:web
pnpm dev:admin
```

Cada script `dev` usa `--strictPort`: si el puerto está ocupado, falla en vez de moverse a otro.

La layer se puede desarrollar sola con su playground: `pnpm --filter base-layer dev`.

## Build

```bash
pnpm build           # ambas
pnpm build:web       # apps/web/.output
pnpm build:admin     # apps/backoffice/.output

# Backoffice estático (solo si NO usas server/api ni routeRules.proxy)
pnpm --filter backoffice generate    # apps/backoffice/.output/public
```

Probar el build en local:

```bash
pnpm --filter web preview            # puerto 4000
pnpm --filter backoffice preview     # puerto 4001
```

En producción (preset Node por defecto) cada app corre con `node .output/server/index.mjs`
y su propio `PORT`; un reverse proxy (Nginx, Caddy…) enruta cada dominio a su puerto.

## Variables de entorno

Cada app tiene su `.env` (copia `.env.example`). Solo se lee en dev/build/generate;
en producción define las variables `NUXT_PUBLIC_*` en tu plataforma de despliegue.

## Editor (VS Code / WebStorm)

Cada proyecto tiene su `tsconfig.json` que apunta a los tipos que Nuxt genera en `.nuxt/`
(en la layer, en `.playground/.nuxt/`). Esos tipos se generan con `nuxt prepare`, que corre
solo en `pnpm install`. Si el editor muestra errores como `Cannot find name 'defineNuxtConfig'`:

```bash
pnpm install        # regenera los tipos en los tres proyectos
```

y reinicia el servidor de TypeScript del editor (VS Code: `Developer: Restart TS Server`).
Para tipar archivos `.vue` el editor necesita la extensión Vue (Volar).

## Cookies en local (opcional)

Las cookies no se separan por puerto: `localhost:3000` y `localhost:3001` las comparten.
Para simular dominios distintos:

```bash
pnpm --filter web exec nuxt dev --host app.localhost --port 3000 --strictPort
pnpm --filter backoffice exec nuxt dev --host admin.localhost --port 3001 --strictPort
```

(Si cambias los hosts, actualiza `NUXT_PUBLIC_ADMIN_URL` y `NUXT_PUBLIC_WEB_URL`.)
