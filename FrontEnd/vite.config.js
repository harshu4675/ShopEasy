import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Minifies the built index.html.
 * Vite ships HTML through esbuild but leaves comments/whitespace, so this
 * strips both without touching inline JSON-LD or the SEO markup itself.
 */
const htmlMinify = () => ({
  name: "html-minify",
  apply: "build",
  enforce: "post",
  transformIndexHtml(html) {
    return html
      .replace(/<!--(?!\[if)[\s\S]*?-->/g, "") // comments (keep conditional)
      .replace(/>\s*\n\s*</g, "><") // inter-tag whitespace
      .replace(/\s{2,}/g, " ")
      .trim();
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    htmlMinify(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Route chunks are fetched on demand and revalidated by the SW runtime
        // caching rules; precaching every one of them would blow up install
        // time for first-time visitors on mobile data.
        globPatterns: ["**/*.{css,html,ico,png,svg,webmanifest}", "assets/index-*.js"],
      },
      // Only real files: there is no favicon.ico in public/, and listing it
      // made the service worker try to precache a 404.
      includeAssets: ["logo192.png", "logo512.png"],
      manifest: {
        name: "Talish Clothes - Fashion & Lifestyle",
        short_name: "Talish",
        description: "Talish Clothes - Shop trendy fashion online",
        theme_color: "#831843",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["shopping", "lifestyle", "fashion"],
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  build: {
    target: "es2020",
    cssMinify: "lightningcss",
    minify: "esbuild",
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        /**
         * Vendor splitting keeps the long-lived dependencies in their own
         * immutable chunks so a product-page tweak doesn't invalidate React
         * for every returning visitor.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("/axios/")) return "vendor-http";
          if (id.includes("react-toastify")) return "vendor-toast";
          if (id.includes("react-icons") || id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("workbox")) return "vendor-workbox";
          return "vendor";
        },

        // Stable, content-hashed names for long cache lifetimes.
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },

  esbuild: {
    // Strip debug noise from production bundles (keeps console.error/warn).
    pure: ["console.log", "console.debug", "console.info"],
    legalComments: "none",
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "axios"],
  },

  server: {
    host: true,
    allowedHosts: true,
  },
});
