import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Vite 配置 — 适配 VS Code WebView 环境
 *
 * 关键约束：
 * 1. WebView 加载的是 vscode-webview:// 协议，不能使用 Vite dev server
 * 2. CSP 要求所有 <script> 带 nonce，因此不能用 code splitting（会动态创建 <script>）
 * 3. 最终产物需要输出到 ../media/ 目录，由后端 gitGraphView.ts 引用
 * 4. 需要单文件输出（inline 所有 JS 和 CSS），或通过后端注入正确的 URI
 *
 * 构建策略：
 * - 输出 out.min.js 和 out.min.css 到 ../media/
 * - 使用 Vite 的 build 将所有模块打包成单个 JS chunk（不分割）
 * - base 设为 './' 以适配 WebView 的 URI
 */
export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 输出到扩展的 media 目录
    outDir: resolve(__dirname, '../media'),
    // 清空输出目录（但保留已有的非构建产物文件如 icon）
    emptyOutDir: false,
    // CSS 代码分割关闭，所有 CSS 内联到 JS 中
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.ts'),
      output: {
        // 单文件输出，不进行 chunk 分割
        // VS Code WebView CSP 不允许动态 <script> 加载
        entryFileNames: 'out.min.js',
        chunkFileNames: 'out.min.js',
        assetFileNames: 'out.min.[ext]',
        // 手动确保所有代码打包到一个 chunk
        manualChunks: undefined,
      },
    },
    // 生产环境压缩
    minify: 'esbuild',
    // 不生成 sourcemap（减少扩展体积）
    sourcemap: false,
    // 警告 chunk 过大（但我们就是需要单文件）
    chunkSizeWarningLimit: 2000,
  },
  // WebView 环境不需要 polyfill
  optimizeDeps: {
    exclude: ['vue'],
  },
});
