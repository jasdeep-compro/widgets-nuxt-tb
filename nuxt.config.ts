// https://nuxt.com/docs/api/configuration/nuxt-config
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));

// Absolute path to the widget monorepo root.
// Adjust if the repos are ever moved relative to each other.
const widgetsRoot = resolve(currentDir, '../widgets');

// Source aliases are only active in dev mode.  Production builds consume the
// published npm packages (or file: overrides in pnpm.overrides) so the LMS
// gets pre-built dist/ artefacts, not raw TypeScript source.
const isDev = process.env.NODE_ENV !== 'production';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    rootAttrs: {
      'aria-live': 'polite'
    },
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: process.env.APP_BASE_URL
            ? `/${process.env.APP_BASE_URL}/assets/favicon.png`
            : '/assets/favicon.png'
        },
        // Preload fonts you lazy-load via JS

        {
          rel: 'preload',
          as: 'font',
          href: '/assets/fonts/SatoshiRegular/Satoshi-Regular.woff2',
          crossorigin: 'anonymous',
          media: 'print',
          onload: "this.media='all'"
        }
      ]
    }
  },
  modules: ['@nuxtjs/tailwindcss'],

  // Public runtime config — override via .env (NUXT_PUBLIC_DLS_ACCOUNT_ID)
  runtimeConfig: {
    public: {
      dlsAccountId: '',
      s3BaseUrl: 'https://gradpath-dev-assets.comprodls.com'
    }
  },

  // Tell Vue's compiler that w-* tags are native custom elements,
  // not missing Vue components.
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => tag.startsWith('w-')
    }
  },

  vite: {
    // In dev mode, map @comprodls/* directly to TypeScript source so Vite
    // owns the files in its module graph.  Any change inside the widget
    // monorepo triggers a reload in the running Nuxt dev server without a
    // manual rebuild.
    //
    // In production mode the aliases are empty — Nuxt resolves packages
    // through node_modules (pnpm.overrides points at the built dist/).
    resolve: {
      alias: isDev
        ? {
            '@comprodls/w-scoring-engine': resolve(
              widgetsRoot,
              'shared/scoring-engine/src/index.ts'
            ),
            '@comprodls/w-player-core': resolve(
              widgetsRoot,
              'shared/player-core/src/index.ts'
            ),
            '@comprodls/w-multi-mcqsr': resolve(
              widgetsRoot,
              'item-players/multi-mcqsr/src/index.ts'
            ),
            '@comprodls/w-fib': resolve(
              widgetsRoot,
              'item-players/fib/src/index.ts'
            ),
            '@comprodls/w-close-ended': resolve(
              widgetsRoot,
              'activity-players/close-ended/src/index.ts'
            )
          }
        : {}
    },

    plugins: [
      // Lit custom elements cannot be re-registered in the same browser
      // session (customElements.define throws if the tag is already known).
      // When any widget source file changes, trigger a full page reload
      // instead of a hot module swap so the browser gets a fresh registry.
      {
        name: 'w-custom-elements-full-reload',
        handleHotUpdate({ file, server }) {
          if (file.includes('widgets')) {
            server.ws.send({ type: 'full-reload' });
            return []; // suppress the default HMR update
          }
        }
      }
    ],

    build: {
      rollupOptions: {
        output: {
          // Use readable filenames for widget and lit chunks; keep Nuxt's
          // default hash-only naming for all framework internals.
          // The _nuxt/ prefix is required — Nuxt only copies files inside
          // that subdirectory to .output/public/_nuxt/.
          chunkFileNames(chunkInfo) {
            const n = chunkInfo.name ?? '';
            if (n.startsWith('w-') || n === 'lit')
              return `_nuxt/${n}-[hash].js`;
            return '_nuxt/[hash].js';
          },
          // Emit each widget package as its own named chunk so:
          //   • chunk names are readable in the network tab
          //   • changing one player only invalidates that player's hash
          //   • lit is isolated so it's never duplicated
          //
          // Add a new entry here whenever a new @comprodls/w-* package
          // is added to the project.  fib-dnd must appear before fib to
          // avoid a partial-path match.
          manualChunks(id) {
            const norm = id.replace(/\\/g, '/');

            // Production: packages resolved from node_modules/@comprodls/w-*
            const npmMatch = norm.match(
              /node_modules\/@comprodls\/(w-[a-z-]+)/
            );
            if (npmMatch) return npmMatch[1];

            // Dev (source aliases active): packages resolved from the source tree.
            // fib-dnd must appear before fib to avoid a partial-path match.
            const srcChunks: [string, string][] = [
              ['shared/player-core', 'w-player-core'],
              ['shared/scoring-engine', 'w-scoring-engine'],
              ['item-players/fib-dnd', 'w-fib-dnd'],
              ['item-players/fib', 'w-fib'],
              ['item-players/multi-mcqsr', 'w-multi-mcqsr'],
              ['activity-players/close-ended', 'w-close-ended']
            ];
            for (const [path, chunk] of srcChunks) {
              if (norm.includes(path)) return chunk;
            }

            if (
              norm.includes('node_modules/lit') ||
              norm.includes('node_modules/@lit')
            ) {
              return 'lit';
            }
          }
        }
      }
    },

    // Lit uses browser-only globals; prevent Vite from SSR-transforming it.
    ssr: {
      noExternal: ['lit', /^@lit\//]
    }
  },

  // Global CSS — resolved to absolute paths to work with Nuxt layers.
  // Ref - https://nuxt.com/docs/guide/going-further/layers#relative-paths-and-aliases
  css: [join(currentDir, './assets/styles/fonts.scss')]
});
