import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Xian Documentation',
  description: 'Official documentation for Xian',
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
