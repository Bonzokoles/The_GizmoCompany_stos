/**
 * Docusaurus Configuration
 * ZENO Browser Documentation Website
 */

const { themes } = require('prism-react-renderer');

module.exports = {
  title: 'ZENO Browser',
  tagline: 'AI-powered web browser with DeepSeek integration',
  url: 'https://zeno-browser.io',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'Bonzokoles',
  projectName: 'zen-bro-wser.org',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/Bonzokoles/zen-bro-wser.org/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/Bonzokoles/zen-bro-wser.org/edit/main/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    navbar: {
      title: 'ZENO Browser',
      logo: {
        alt: 'ZENO Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'getting-started',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://github.com/Bonzokoles/zen-bro-wser.org',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Windows Installation', to: '/docs/installation/windows' },
            { label: 'FAQ', to: '/docs/faq' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/Bonzokoles/zen-bro-wser.org' },
            { label: 'Issues', href: 'https://github.com/Bonzokoles/zen-bro-wser.org/issues' },
            { label: 'Discussions', href: 'https://github.com/Bonzokoles/zen-bro-wser.org/discussions' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub Discussions', href: 'https://github.com/Bonzokoles/zen-bro-wser.org/discussions' },
            { label: 'Report Issues', href: 'https://github.com/Bonzokoles/zen-bro-wser.org/issues' },
            { label: 'Twitter', href: 'https://twitter.com/zenobrowser' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ZENO Browser. Built with Docusaurus.`,
    },

    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
    },

    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  },

  plugins: process.env.GOOGLE_ANALYTICS_ID
    ? [
      [
        '@docusaurus/plugin-google-analytics',
        {
          trackingID: process.env.GOOGLE_ANALYTICS_ID,
          anonymizeIP: true,
        },
      ],
    ]
    : [],
};