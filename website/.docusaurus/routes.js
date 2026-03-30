import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/pl/docs',
    component: ComponentCreator('/pl/docs', '71b'),
    routes: [
      {
        path: '/pl/docs/faq',
        component: ComponentCreator('/pl/docs/faq', '7a5'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/pl/docs/getting-started',
        component: ComponentCreator('/pl/docs/getting-started', 'a0c'),
        exact: true,
        sidebar: "docs"
      },
      {
        path: '/pl/docs/installation/windows',
        component: ComponentCreator('/pl/docs/installation/windows', '721'),
        exact: true,
        sidebar: "docs"
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
