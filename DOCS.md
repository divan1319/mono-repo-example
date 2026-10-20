# Cómo funciona el monorepo `nuxt-dos-apps`

Este documento explica tres cosas:

1. Qué es `packages/` y cómo se conecta la layer con las apps.
2. Qué hacen los archivos y comandos de la raíz.
3. Cómo funciona por dentro cada proyecto (`web`, `backoffice` y `base-layer`).

Para que sepas qué tan firme es cada afirmación, marco el origen:

- **[probado]**: lo comprobé ejecutando este mismo proyecto (Nuxt 4.6.2, pnpm 10.18.0).
- **[doc]**: viene de la documentación oficial de Nuxt o pnpm (enlaces al final).
- **[no verificado]**: es lo que espero que pase, pero no lo probé.

---

## 1. Vista general

```
nuxt-dos-apps/
├── package.json            ← scripts que orquestan todo (no es una app)
├── pnpm-workspace.yaml     ← le dice a pnpm qué carpetas son proyectos
├── pnpm-lock.yaml          ← versiones exactas de TODO el monorepo (uno solo)
├── node_modules/
│   └── .pnpm/              ← "almacén" real de paquetes (compartido)
├── apps/
│   ├── web/                ← proyecto Nuxt completo (SSR, puerto 3000)
│   └── backoffice/         ← proyecto Nuxt completo (SPA, puerto 3001)
└── packages/
    └── base-layer/         ← Nuxt Layer: código que ambas apps heredan
```

La idea en una frase: **son tres proyectos Nuxt independientes que comparten un solo `node_modules` y un solo lockfile, y dos de ellos (las apps) heredan código del tercero (la layer).**

Hay dos conceptos distintos que suelen confundirse:

| Concepto | Lo resuelve | Qué hace |
|---|---|---|
| **Workspace** | pnpm | Instala dependencias de varios proyectos a la vez y los enlaza entre sí. |
| **Layer** | Nuxt | Fusiona componentes, composables, config, etc. de un proyecto Nuxt dentro de otro. |

El workspace permite que la app *encuentre* la layer; la layer es lo que hace que Nuxt *use* su contenido.

---

## 2. Los archivos de la raíz

### 2.1 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"

onlyBuiltDependencies:
  - esbuild
  - "@parcel/watcher"
  - unrs-resolver
```

- **`packages`**: patrones de carpetas. Cada carpeta que coincide y tiene `package.json` es un proyecto del workspace. pnpm detectó 4 proyectos: la raíz, `web`, `backoffice` y `base-layer` **[probado]**.
  - `*` solo baja un nivel: `apps/*` encuentra `apps/web`, pero no `apps/web/algo`. Tampoco coincide con carpetas que empiezan con punto **[doc]**.
- **`onlyBuiltDependencies`**: desde pnpm 10, las dependencias **no ejecutan** sus scripts de instalación (`postinstall`, etc.) salvo que estén en esta lista **[doc]**. `esbuild` necesita ese script para descargar su binario. Por eso aparece aquí.
  - ⚠️ La documentación más reciente de pnpm marca `onlyBuiltDependencies` como **obsoleta** y menciona `allowBuilds` como reemplazo **[doc]**. Con pnpm 10.18 funciona **[probado]**. Si actualizas pnpm y ves avisos, revisa la documentación de tu versión.

### 2.2 `package.json` de la raíz

```jsonc
{
  "name": "nuxt-dos-apps",
  "private": true,                    // evita publicarlo por error en npm
  "packageManager": "pnpm@10.18.0",   // corepack usa exactamente esta versión de pnpm
  "scripts": {
    "dev":         "pnpm --filter \"./apps/*\" --parallel dev",
    "dev:web":     "pnpm --filter web dev",
    "dev:admin":   "pnpm --filter backoffice dev",
    "build":       "pnpm --filter \"./apps/*\" build",
    "build:web":   "pnpm --filter web build",
    "build:admin": "pnpm --filter backoffice build"
  }
}
```

La raíz **no es una app** y no tiene dependencias propias. Solo tiene scripts que *delegan* en los proyectos.

### 2.3 Qué hace cada comando

Todos usan la misma idea: **`pnpm --filter <selector> <script>`** significa "ejecuta el script `<script>` del `package.json` de los proyectos que coincidan con `<selector>`".

| Comando | Selector | Qué ejecuta realmente |
|---|---|---|
| `pnpm dev` | `"./apps/*"` (ruta) | `nuxt dev --port 3000 --strictPort` en `web` **y** `nuxt dev --port 3001 --strictPort` en `backoffice`, **a la vez** |
| `pnpm dev:web` | `web` (nombre) | Solo el `dev` de `apps/web` |
| `pnpm dev:admin` | `backoffice` (nombre) | Solo el `dev` de `apps/backoffice` |
| `pnpm build` | `"./apps/*"` | `nuxt build` en ambas apps |
| `pnpm build:web` | `web` | `nuxt build` solo en `web` |
| `pnpm build:admin` | `backoffice` | `nuxt build` solo en `backoffice` |

Detalles de cada pieza:

- **Selector por nombre (`web`)**: coincide con el campo `"name"` del `package.json` del proyecto, no con el nombre de la carpeta **[doc]**. Aquí ambos coinciden porque `nuxi init` usa el nombre de la carpeta.
- **Selector por ruta (`"./apps/*"`)**: es un glob relativo a la carpeta desde donde se ejecuta. Coincide por **ubicación**, no por nombre **[doc]**. Las comillas evitan que tu shell expanda el `*` antes de que llegue a pnpm. Ventaja: si mañana agregas `apps/landing`, `pnpm dev` y `pnpm build` la incluyen sin tocar nada.
- **`--parallel`**: arranca el script en todos los proyectos seleccionados **inmediatamente**, sin esperar a que uno termine y sin orden de dependencias. La salida aparece prefijada con el nombre del proyecto **[doc] [probado]**. Es necesario en `dev` porque un servidor de desarrollo **nunca termina**: sin `--parallel`, el segundo no arrancaría hasta que cierres el primero.
- **Sin `--parallel` (en `build`)**: pnpm respeta el orden de dependencias del workspace **[doc]**. En este proyecto da igual porque la layer no tiene script `build` que las apps necesiten, pero es el comportamiento correcto para builds.
- **`--port 3000 --strictPort`** (en cada app, no en la raíz): fija el puerto. Con `--strictPort`, si el puerto está ocupado Nuxt **falla** en vez de usar otro en silencio **[doc]**.

Otros comandos útiles con la misma lógica:

```bash
pnpm --filter backoffice generate     # cualquier script del package.json de esa app
pnpm --filter web preview             # probar el build de web (puerto 4000)
pnpm --filter base-layer dev          # levantar la layer sola (su playground)
pnpm --filter web add zod             # instalar una dependencia SOLO en web
pnpm --filter web exec nuxt dev --host app.localhost --port 3000   # ejecutar un binario, no un script
```

`exec` ejecuta un binario de `node_modules/.bin` del proyecto, mientras que sin `exec` se ejecuta un *script* del `package.json`.

---

## 3. Qué pasa al ejecutar `pnpm install`

Paso a paso, en este proyecto **[probado]**:

1. pnpm lee `pnpm-workspace.yaml` y encuentra los 4 proyectos.
2. Resuelve las dependencias de **todos** y escribe un único `pnpm-lock.yaml` en la raíz. El lockfile tiene una sección por proyecto (`apps/web`, `apps/backoffice`, `packages/base-layer`).
3. Descarga los paquetes una sola vez en `node_modules/.pnpm/` (unos 700 aquí).
4. En cada proyecto crea un `node_modules/` con **enlaces simbólicos** hacia ese almacén:

   ```
   apps/web/node_modules/nuxt       -> ../../../node_modules/.pnpm/nuxt@4.6.2_.../node_modules/nuxt
   apps/web/node_modules/vue        -> ../../../node_modules/.pnpm/vue@3.5.44_.../node_modules/vue
   apps/web/node_modules/base-layer -> ../../../packages/base-layer      ← ¡la layer!
   ```

   `nuxt` está instalado una sola vez aunque lo usen los tres proyectos.
5. Ejecuta los `postinstall` de cada proyecto:
   - `apps/web` y `apps/backoffice` → `nuxt prepare` (genera `.nuxt/`)
   - `packages/base-layer` → `nuxt prepare .playground` (genera `.playground/.nuxt/`)

### `workspace:*`

Cada app declara la layer así:

```jsonc
"devDependencies": {
  "base-layer": "workspace:*"
}
```

- `workspace:` obliga a pnpm a usar el paquete **local** del workspace; nunca lo busca en el registro de npm. Si no existe, falla **[doc]**.
- `*` significa "cualquier versión".
- Por defecto el resultado es un **enlace simbólico**, no una copia **[doc] [probado]**. Por eso un cambio en `packages/base-layer` lo ven las apps al instante, sin reinstalar.
- Si algún día publicas la layer en npm, pnpm reemplaza `workspace:*` por la versión real (p. ej. `0.0.1`) al publicar **[doc]**.

---

## 4. `packages/base-layer`: qué es y cómo se conecta

### 4.1 Qué es una layer

Una layer es **un proyecto Nuxt parcial** cuyo contenido se fusiona con el de la app que la extiende. Lo único que la convierte en layer es tener un `nuxt.config.ts` **[doc]**.

Nuxt escanea automáticamente estas partes de la layer y las suma a la app **[doc]**:

| En la layer | En la app se comporta como si estuviera en… |
|---|---|
| `app/components/*` | `app/components/` (auto-import de componentes) |
| `app/composables/*` | `app/composables/` (auto-import) |
| `app/utils/*` | `app/utils/` (auto-import) |
| `app/layouts/*`, `app/middleware/*`, `app/pages/*`, `app/plugins/*` | sus equivalentes en la app |
| `app/app.config.ts` | se fusiona con el `app.config` de la app |
| `server/*` | `server/` (endpoints, middleware de servidor) |
| `nuxt.config.ts` | se fusiona con el `nuxt.config.ts` de la app |

### 4.2 Cómo llega la app a la layer (la cadena completa)

```
apps/web/nuxt.config.ts
  extends: ['base-layer']
        │
        │ 1. Nuxt resuelve 'base-layer' como un paquete, desde apps/web
        ▼
apps/web/node_modules/base-layer      (symlink creado por workspace:*)
        │
        ▼
packages/base-layer/package.json
  "main": "./nuxt.config.ts"          2. el "main" apunta al config de la layer
        │
        ▼
packages/base-layer/nuxt.config.ts    3. Nuxt lo carga como layer y escanea
                                         app/, server/, app/app.config.ts…
```

Lo comprobé en lo que Nuxt genera para `web` **[probado]**:

```ts
// apps/web/.nuxt/components.d.ts
export const AppHeader: typeof import("../../../packages/base-layer/app/components/AppHeader.vue")['default']

// apps/web/.nuxt/imports.d.ts
export { useApiBase } from '../../../packages/base-layer/app/composables/useApiBase';
```

Es decir: para la app, `AppHeader` y `useApiBase()` existen como si fueran suyos.

> También podrías escribir `extends: ['../../packages/base-layer']` (ruta relativa). Funciona igual, pero usar el nombre del paquete es más limpio y no depende de dónde esté la carpeta.

### 4.3 Prioridad: quién gana si hay dos archivos iguales

De mayor a menor prioridad **[doc]**:

1. **Los archivos de la propia app.**
2. Layers en `~~/layers/` de la app (si existieran).
3. Layers en `extends`, y dentro de ellas, la primera de la lista gana.

Lo probé creando `apps/web/app/components/AppHeader.vue` **[probado]**:

```
con el archivo en la app:  AppHeader → ../app/components/AppHeader.vue
sin el archivo:            AppHeader → ../../../packages/base-layer/app/components/AppHeader.vue
```

Así puedes personalizar un componente compartido en una sola app sin tocar la layer.

### 4.4 Cómo se fusiona la configuración

- **`nuxt.config.ts`**: la layer declara `runtimeConfig.public.apiBase` y `appName`. Cada app los vuelve a declarar con sus valores y además añade los suyos (`adminUrl` en `web` y `webUrl` en `backoffice`). Los tipos generados de `web` incluyen las tres claves **[probado]**.
- **`app.config.ts`**: Nuxt genera un archivo que fusiona los `app.config` con `defu`, una función que mezcla objetos dando prioridad al primero. En `web`, como la app no tiene `app.config.ts` propio, solo aparece el de la layer **[probado]**.

### 4.5 Archivos de la layer (los que trajo el template `layer`)

| Archivo | Para qué sirve |
|---|---|
| `nuxt.config.ts` | Config que heredan las apps. Aquí: `runtimeConfig.public` con valores por defecto. |
| `app/components/AppHeader.vue` | Componente compartido (ejemplo). |
| `app/composables/useApiBase.ts` | Composable compartido (ejemplo). |
| `app/app.config.ts` | `app.config` compartido; declara `myLayer.name` y su tipo. |
| `app/app.vue` | Solo lo usa el **playground**. Las apps tienen su propio `app.vue`, que tiene prioridad. |
| `.playground/` | Mini app Nuxt que hace `extends: ['..']` para probar la layer **sola**, sin las apps. |
| `.playground/app.config.ts` | Muestra cómo una app sobrescribe el `app.config` de la layer. |
| `tsconfig.json` | `extends: "./.playground/.nuxt/tsconfig.json"`: la layer toma sus tipos del playground. |
| `.nuxtrc` | `typescript.includeWorkspace = true`: según el esquema de Nuxt, "Include parent workspace in the Nuxt project. Mostly useful for themes and module authors" **[probado: leído del esquema instalado]**. Lo interpreto como que el playground incluye en sus tipos la carpeta padre (la layer); la descripción no da más detalle. |
| `eslint.config.js` | Usa la config de ESLint que genera el módulo `@nuxt/eslint` en el playground. |
| `.editorconfig`, `.gitignore`, `README.md` | Del template. |

Scripts de la layer:

```jsonc
"dev":         "nuxi dev .playground",       // levanta el playground
"dev:prepare": "nuxt prepare .playground",
"postinstall": "nuxt prepare .playground",   // ← agregado: genera tipos al instalar
"build":       "nuxt build .playground",
"generate":    "nuxt generate .playground",
"preview":     "nuxt preview .playground",
"lint":        "eslint ."
```

`nuxi` y `nuxt` son **el mismo binario**: el paquete `nuxt` declara ambos nombres apuntando a `bin/nuxt.mjs` **[probado]**. El argumento `.playground` indica la carpeta del proyecto Nuxt sobre el que se trabaja.

### 4.6 Reglas importantes al escribir código en la layer

1. **Dependencias**: todo lo que la layer *importe* (por ejemplo `zod` o `dayjs`) va en sus `dependencies`. `nuxt` y lo que sea solo para pruebas va en `devDependencies` **[doc]**.

   ```bash
   pnpm --filter base-layer add zod
   ```

2. **Alias `~` y `@`**: dentro de la layer se resuelven **relativos a la app que la usa**, no a la layer **[doc]**. Si en la layer escribes `import x from '~/utils/x'`, buscará `apps/web/app/utils/x`. Usa imports relativos o, mejor aún, los auto-imports.
3. **Rutas relativas en el `nuxt.config.ts` de la layer** (por ejemplo `css: ['./assets/main.css']`): también se resuelven desde la app **[doc]**. Usa rutas absolutas:

   ```ts
   import { fileURLToPath } from 'node:url'
   export default defineNuxtConfig({
     css: [fileURLToPath(new URL('./app/assets/main.css', import.meta.url))],
   })
   ```

4. **Alias `#layers/...`**: esta layer **no** tiene uno, porque no define `$meta.name` **[probado]**. Si lo quieres, agrega `$meta: { name: 'base' }` a su `nuxt.config.ts` y tendrás `#layers/base` **[doc]**.
5. **No pongas páginas propias de una sola app en la layer**: todo lo que esté en `app/pages/` de la layer aparece en **ambas** apps.

---

## 5. Cómo funciona cada app por dentro

`apps/web` y `apps/backoffice` son proyectos Nuxt normales, creados con `nuxi init --template minimal`.

### 5.1 Estructura

```
apps/web/
├── app/
│   ├── app.vue            ← raíz de la app: <AppHeader /> (de la layer) + <NuxtPage />
│   └── pages/index.vue    ← ruta "/"; usa useApiBase() (de la layer)
├── public/                ← favicon.ico, robots.txt (se sirven tal cual)
├── nuxt.config.ts         ← extends: ['base-layer'], runtimeConfig, (ssr: false en backoffice)
├── tsconfig.json          ← solo apunta a .nuxt/tsconfig.*.json
├── .env.example           ← plantilla de variables (cópiala a .env)
├── package.json           ← dependencias y scripts de ESTA app
├── .nuxt/                 ← GENERADO (no se edita ni se versiona)
└── .output/               ← GENERADO por build (no se versiona)
```

### 5.2 `.nuxt/`: lo que genera `nuxt prepare` (y `dev`/`build`)

`nuxt prepare` "crea un directorio `.nuxt` en tu aplicación y genera tipos" **[doc]**. Contenido real **[probado]**:

| Archivo | Para qué |
|---|---|
| `tsconfig.app.json`, `tsconfig.server.json`, `tsconfig.shared.json`, `tsconfig.node.json` | Configs de TypeScript separadas para el código de la app (navegador/Vue), el servidor (Nitro), el código compartido y los archivos de config. **Incluyen las rutas de la layer** (`../../../packages/base-layer/app/**/*`). |
| `components.d.ts` | Tipos de todos los componentes auto-importados, incluidos los de la layer. |
| `imports.d.ts`, `types/imports.d.ts` | Tipos de los auto-imports (`useRuntimeConfig`, `useApiBase`, …). |
| `nuxt.d.ts` | Referencias que unen todos los tipos anteriores. |
| `types/runtime-config.d.ts` | Tipos de `useRuntimeConfig()` fusionando app + layer. |
| `app.config.mjs` | El `app.config` fusionado. |

Tu `tsconfig.json` solo hace referencia a esos archivos:

```json
{
  "files": [],
  "references": [
    { "path": "./.nuxt/tsconfig.app.json" },
    { "path": "./.nuxt/tsconfig.server.json" },
    { "path": "./.nuxt/tsconfig.shared.json" },
    { "path": "./.nuxt/tsconfig.node.json" }
  ]
}
```

Por eso, si `.nuxt/` no existe (no se ha ejecutado `pnpm install` o `nuxt prepare`), el editor marca `Cannot find name 'defineNuxtConfig'`. Sin `tsconfig.json`, el editor directamente no sabe dónde buscar los tipos **[probado]**.

### 5.3 `nuxt dev`

- Levanta un servidor de desarrollo en el puerto del script (3000 o 3001).
- Regenera `.nuxt/` y recompila al guardar archivos.
- Cada app tiene su propio `.nuxt/`, así que las dos pueden correr a la vez sin chocar **[probado]**.
- Lee el `.env` de **esa** app **[doc]**.
- [no verificado] Que el recargado en caliente (HMR) detecte cambios en archivos de `packages/base-layer`. Lo esperable es que sí, porque la layer forma parte del proyecto que Nuxt observa, pero no lo probé aquí.

### 5.4 `nuxt build`: qué produce

Lo que genera `apps/web/.output/` **[probado]**:

```
.output/
├── nitro.json              ← metadatos: preset "node-server", versión de Nuxt/Nitro
├── public/                 ← archivos estáticos: _nuxt/*.js, *.css, favicon, robots
└── server/
    ├── index.mjs           ← punto de entrada del servidor
    ├── chunks/             ← código del servidor (SSR, rutas, Nitro)
    ├── node_modules/       ← SOLO las dependencias que el servidor necesita
    └── package.json        ← "name": "web-prod", con esas dependencias
```

Puntos clave:

- **Es autónomo**: trae su propio `node_modules/` mínimo, así que para desplegar copias solo `.output/`, sin el monorepo ni el `node_modules` de la raíz.
- **La layer ya está "horneada" dentro**: no necesita `packages/` en producción.
- **Se ejecuta con** `node .output/server/index.mjs`.
- **Lee variables en tiempo de ejecución** **[probado]**:

  ```bash
  PORT=5055 NUXT_PUBLIC_API_BASE=https://api.ejemplo.com node .output/server/index.mjs
  # la página mostró: API base: https://api.ejemplo.com
  ```

  En producción el `.env` **no** se lee; las variables se definen en el servidor o la plataforma **[doc]**. La regla de nombres es: `runtimeConfig.public.apiBase` → `NUXT_PUBLIC_API_BASE`; `runtimeConfig.public.adminUrl` → `NUXT_PUBLIC_ADMIN_URL`.

### 5.5 Diferencia entre `web` y `backoffice`

| | `web` | `backoffice` |
|---|---|---|
| `ssr` | `true` (por defecto) | `false` |
| Qué devuelve el servidor | HTML ya renderizado con el contenido **[probado]** | Un HTML casi vacío (`<div id="__nuxt">`) que Vue llena en el navegador **[probado]** |
| SEO | Sí | No hace falta (está detrás de un login) |
| `nuxt build` | Servidor Node + estáticos | También genera servidor; útil si después agregas `server/api` o un proxy |
| `nuxt generate` | — | Solo `.output/public/` con `index.html`, `200.html`, `404.html`, **sin servidor** **[probado]**. Se puede subir a cualquier hosting estático. |

⚠️ Si el backoffice usa `nuxt generate`, no puede tener `server/api` ni `routeRules.proxy`, porque no hay servidor **[doc]**. Además, como no hay servidor, las `NUXT_PUBLIC_*` se toman **en el momento del `generate`**, no al desplegar. Esto último lo infiero de que no hay servidor que las lea; no es una frase textual de la doc.

---

## 6. Flujo típico de trabajo

```bash
# Primera vez
pnpm install                    # instala, enlaza y genera .nuxt/ en los 3 proyectos
cp apps/web/.env.example apps/web/.env
cp apps/backoffice/.env.example apps/backoffice/.env

# Desarrollo
pnpm dev                        # web :3000 + backoffice :3001

# Agregar algo compartido
#   → crea el archivo en packages/base-layer/app/components|composables|utils/
#   → ya está disponible en ambas apps (auto-import)

# Agregar algo solo para una app
#   → créalo dentro de apps/<app>/app/...

# Dependencias
pnpm --filter web add <paquete>          # solo web
pnpm --filter base-layer add <paquete>   # algo que importa la layer

# Producción
pnpm build                      # .output/ en cada app
pnpm --filter web preview       # probar el build en local (:4000)
```

---

## 7. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `Cannot find name 'defineNuxtConfig'` (o `useRuntimeConfig`, etc.) | Falta `.nuxt/` o el `tsconfig.json` | `pnpm install` y reiniciar el TS Server del editor |
| `pnpm dev` falla con "port in use" | `--strictPort` y el puerto está ocupado | Cierra el proceso que lo usa o cambia el puerto en el script |
| La segunda app no arranca con `pnpm dev` | Falta `--parallel` | Debe estar en el script `dev` de la raíz |
| Error al importar un paquete desde la layer | La dependencia no está en `dependencies` de la layer | `pnpm --filter base-layer add <paquete>` |
| Un import con `~/` desde la layer no encuentra el archivo | `~` apunta a la app, no a la layer | Usa imports relativos o auto-imports |
| Un componente de la layer no cambia en una app | La app tiene un archivo con el mismo nombre, que tiene prioridad | Revisa `apps/<app>/app/components/` |
| `esbuild` falla al instalar | pnpm bloqueó su `postinstall` | Debe estar en `onlyBuiltDependencies` (o `allowBuilds` en versiones nuevas) |

---

## 8. Fuentes

- Nuxt, Layers: https://nuxt.com/docs/4.x/guide/going-further/layers
- Nuxt, Layers (introducción): https://nuxt.com/docs/4.x/getting-started/layers
- Nuxt, `nuxt dev`: https://nuxt.com/docs/4.x/api/commands/dev
- Nuxt, `nuxt prepare`: https://nuxt.com/docs/4.x/api/commands/prepare
- Nuxt, `nuxt build`: https://nuxt.com/docs/4.x/api/commands/build
- Nuxt, Runtime config y `.env`: https://nuxt.com/docs/4.x/guide/going-further/runtime-config
- Nuxt, Prerendering / `nuxt generate`: https://nuxt.com/docs/4.x/getting-started/prerendering
- Nuxt, TypeScript: https://nuxt.com/docs/4.x/guide/concepts/typescript
- pnpm, Workspaces y `workspace:`: https://pnpm.io/workspaces
- pnpm, Filtering (`--filter`): https://pnpm.io/filtering
- pnpm, `pnpm run` (`--parallel`): https://pnpm.io/cli/run
- pnpm 10, Settings (`onlyBuiltDependencies`): https://pnpm.io/10.x/settings