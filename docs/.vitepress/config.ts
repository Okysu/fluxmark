import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

const repository = 'https://github.com/Okysu/fluxmark'
const docsBase = '/fluxmark/'

const englishSidebar = {
  '/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Getting started', link: '/guide/getting-started' },
        { text: 'Language syntax', link: '/guide/syntax' },
        { text: 'Plugins', link: '/guide/plugins' },
        { text: 'AST walker', link: '/guide/walker' },
        { text: 'HTML renderer', link: '/guide/renderers' },
      ],
    },
  ],
  '/api/': [
    {
      text: 'Reference',
      items: [{ text: 'API overview', link: '/api/' }],
    },
  ],
}

const chineseSidebar = {
  '/zh/guide/': [
    {
      text: '使用指南',
      items: [
        { text: '快速上手', link: '/zh/guide/getting-started' },
        { text: '语言语法', link: '/zh/guide/syntax' },
        { text: '插件系统', link: '/zh/guide/plugins' },
        { text: 'AST 遍历', link: '/zh/guide/walker' },
        { text: 'HTML 渲染器', link: '/zh/guide/renderers' },
      ],
    },
  ],
  '/zh/api/': [
    {
      text: 'API 参考',
      items: [{ text: 'API 总览', link: '/zh/api/' }],
    },
  ],
}

export default defineConfig({
  base: docsBase,
  lang: 'en-US',
  title: 'FluxMark',
  description:
    'A zero-backtracking markup compiler with a typed AST, staged plugins and semantic HTML output.',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
    config(markdown) {
      const fence = markdown.renderer.rules.fence
      markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index]
        const rendered =
          fence === undefined
            ? self.renderToken(tokens, index, options)
            : fence(tokens, index, options, env, self)
        if (token === undefined || !/\blive\b/.test(token.info)) return rendered
        const source = encodeURIComponent(token.content)
        const labeled = rendered.replace(
          '<span class="lang">text</span>',
          '<span class="lang">FluxMark</span>',
        )
        return `${labeled}\n<FluxExample source="${source}" />`
      }
    },
  },
  sitemap: {
    hostname: 'https://okysu.github.io/fluxmark/',
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${docsBase}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3451b2' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'FluxMark' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Linear-time parsing, a typed AST, staged plugins and semantic HTML.',
      },
    ],
  ],
  vite: {
    resolve: {
      alias: {
        fluxmark: fileURLToPath(
          new URL('../../packages/fluxmark/src/index.ts', import.meta.url),
        ),
      },
    },
    server: {
      fs: {
        allow: [fileURLToPath(new URL('../..', import.meta.url))],
      },
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'FluxMark',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Playground', link: '/playground', activeMatch: '/playground' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
    ],
    sidebar: englishSidebar,
    socialLinks: [
      { icon: 'github', link: repository },
      { icon: 'npm', link: 'https://www.npmjs.com/package/fluxmark' },
    ],
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    lastUpdated: {
      text: 'Last updated',
      formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 FluxMark contributors',
    },
    search: {
      provider: 'local',
    },
    darkModeSwitchLabel: 'Appearance',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Return to top',
    langMenuLabel: 'Change language',
    externalLinkIcon: true,
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      description:
        '具备类型化 AST、分阶段插件与语义化 HTML 输出的零回溯标记语言编译器。',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started', activeMatch: '/zh/guide/' },
          { text: '工作台', link: '/zh/playground', activeMatch: '/zh/playground' },
          { text: 'API', link: '/zh/api/', activeMatch: '/zh/api/' },
        ],
        sidebar: chineseSidebar,
        editLink: {
          pattern: `${repository}/edit/main/docs/:path`,
          text: '在 GitHub 上编辑此页',
        },
        lastUpdated: {
          text: '最后更新',
          formatOptions: { dateStyle: 'medium', timeStyle: 'short' },
        },
        outline: {
          level: [2, 3],
          label: '本页目录',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        footer: {
          message: '基于 MIT 许可证发布',
          copyright: 'Copyright © 2026 FluxMark contributors',
        },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        langMenuLabel: '切换语言',
        notFound: {
          title: '页面不存在',
          quote: '这里没有你要找的内容。',
          linkText: '返回首页',
          linkLabel: '首页',
          code: '404',
        },
      },
    },
  },
})
