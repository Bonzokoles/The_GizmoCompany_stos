/**
 * Sidebar configuration for documentation
 */

module.exports = {
  docs: [
    'getting-started',
    {
      label: 'Installation',
      items: [
        'installation/windows',
        'installation/macos',
        'installation/linux',
        'installation/podman',
        'installation/docker',
      ],
    },
    {
      label: 'User Guide',
      items: [
        'user-guide/interface',
        'user-guide/tabs-and-windows',
        'user-guide/ai-assistant',
        'user-guide/plugins',
        'user-guide/cloudflare-tunnel',
        'user-guide/settings',
      ],
    },
    {
      label: 'Plugin Development',
      items: [
        'plugin-development/overview',
        'plugin-development/api-reference',
        'plugin-development/examples',
        'plugin-development/publishing',
      ],
    },
    {
      label: 'Advanced',
      items: [
        'advanced/architecture',
        'advanced/security',
        'advanced/performance',
        'advanced/troubleshooting',
      ],
    },
    {
      label: 'Contributing',
      items: [
        'contributing/guide',
        'contributing/code-style',
        'contributing/testing',
      ],
    },
  ],
};