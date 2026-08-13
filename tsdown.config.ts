import { defineConfig } from 'tsdown'

/**
 * tsdown 打包配置
 *
 * 把后端 TS 代码 + iconv-lite 依赖 bundle 成单文件，
 * 这样 VSIX 不需要 node_modules。
 *
 * vscode 模块由 VS Code 运行时提供，标记为 external。
 * fs 模块由 package-src.js 做 requireWithFallback 后处理。
 */
export default defineConfig({
  entry: [
    'src/extension.ts',
    'src/askpass/askpassMain.ts',
  ],
  format: 'cjs',
  outDir: 'out',
  /**
   * vscode 由 VS Code 运行时提供
   * 其他所有依赖（iconv-lite 等）全部内联 bundle
   */
  external: ['vscode'],
  /** 强制内联 dependencies（默认会被 external 排除） */
  noExternal: [/^iconv-lite$/, /^safer-buffer$/],
  /** 输出 .js 而非 .cjs（package.json main 指向 ./out/extension.js） */
  outExtensions: () => ({ js: '.js' }),
  sourcemap: true,
  clean: true,
  /** 不生成 .d.ts，扩展运行时不需要 */
  dts: false,
  /** 保持 __dirname 和 __filename 为 CJS 行为 */
  platform: 'node',
  target: 'es6',
})
