import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/',
  title: 'Xian Documentation',
  description: 'Official documentation for Xian Technology',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/xian-technology/xian-docs-web' }
    ]
  }
})
