import { defineConfig } from 'vitepress';

const repository = 'https://github.com/minkinad/api-sdk-generator';
const docsBase = process.env.DOCS_BASE ?? '/';

export default defineConfig({
  base: docsBase,
  cleanUrls: true,
  description: 'Generate production-ready TypeScript SDK clients from OpenAPI 3.x schemas.',
  lang: 'en-US',
  lastUpdated: true,
  outDir: 'docs/.vitepress/dist',
  themeConfig: {
    footer: {
      copyright: 'MIT Licensed',
      message: 'api-sdk-generator documentation',
    },
    nav: [
      { text: 'Guide', link: '/guide/installation' },
      { text: 'Release Flow', link: '/guide/release-flow' },
      { text: 'GitHub', link: repository },
    ],
    search: {
      provider: 'local',
    },
    sidebar: [
      {
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Quick Start', link: '/guide/quick-start' },
          { text: 'CLI Usage', link: '/guide/cli-usage' },
          { text: 'Generated SDK Example', link: '/guide/generated-sdk-example' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'GitHub Actions Release Flow', link: '/guide/release-flow' },
          { text: 'Publishing to npm', link: '/guide/publishing-npm' },
          { text: 'Publishing to GitHub Packages', link: '/guide/publishing-github-packages' },
          { text: 'Contributing', link: '/guide/contributing' },
        ],
        text: 'Guide',
      },
    ],
    socialLinks: [{ icon: 'github', link: repository }],
  },
  title: 'api-sdk-generator',
});
