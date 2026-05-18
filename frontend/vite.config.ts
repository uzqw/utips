import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from "vite-svg-loader"
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

function replaceEvalGlobalFallback() {
    const replaceUnsafeEvalFallbacks = (code: string) => code
        .replace(/Function\((['"])return this\1\)\(\)/g, 'globalThis')
        .replace(/new Function\("return \("\+([A-Za-z_$][\w$]*)\+"\);"\)\(\)/g, 'JSON.parse($1)')

    return {
        name: 'replace-eval-global-fallback',
        enforce: 'pre' as const,
        transform(code: string) {
            const replaced = replaceUnsafeEvalFallbacks(code)
            return replaced === code ? null : { code: replaced, map: null }
        },
        renderChunk(code: string) {
            const replaced = replaceUnsafeEvalFallbacks(code)
            return replaced === code ? null : { code: replaced, map: null }
        },
        generateBundle(_options: unknown, bundle: Record<string, any>) {
            for (const item of Object.values(bundle)) {
                if (item.type !== 'chunk') continue
                item.code = replaceUnsafeEvalFallbacks(item.code)
            }
        },
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: '0.0.0.0',// 自定义主机名
        port: 17170,// 自定义端口
        https: false,
        proxy: {
            // PocketBase API 代理
            '/api': {
                target: 'http://0.0.0.0:17171',
                changeOrigin: true,
            },
            '/api/files': {
                target: 'http://0.0.0.0:17171',
                changeOrigin: true,
            },
            '/utips-config.js': {
                target: 'http://0.0.0.0:17171',
                changeOrigin: true,
                configure: (proxy, _options) => {
                    proxy.on('error', (_err, _req, res) => {
                        res.writeHead(200, {
                            'Content-Type': 'application/javascript',
                        });
                        res.end('window.__UTIPS_CONFIG__ = {};');
                    });
                }
            },
        }
    },
    base: './',
    plugins: [
        vue(),
        svgLoader(),
        replaceEvalGlobalFallback(),
        VitePWA({
            injectRegister: 'auto',
            registerType: 'autoUpdate',
            devOptions: {
                enabled: false // 开发模式下禁用 PWA 以提升速度
            },
            workbox: {
                globIgnores: ['**/utips-config.js']
            },

            // MANIFEST PWA https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html
            includeAssets: ['logo.svg', 'apple-touch-icon.png', 'mask-icon.svg', 'favicon.png'],
            manifest: {
                name: 'utips',
                short_name: "日记",
                theme_color: "#373737",
                start_url: "./",
                display: "standalone",
                background_color: "#373737",
                icons: [
                    {
                        src: "logo.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                        purpose: "any",
                    },
                    {
                        src: "appicon-apple.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@/view': resolve(__dirname, './src/view'),
        },
    },
    optimizeDeps: {
        include: [
            'vue',
            'vue-router',
            'pinia',
            'moment',
            'axios',
            'floating-vue',
            '@vuepic/vue-datepicker',
            'pocketbase'
        ]
    }

})
