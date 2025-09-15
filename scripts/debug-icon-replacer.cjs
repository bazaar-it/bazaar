require('ts-node/register/transpile-only');

async function run() {
  const { replaceIconifyIcons } = require('../src/server/services/render/replace-iconify-icons.ts');
  const cases = [
    `<IconifyIcon icon="mdi:home" />`,
    `<IconifyIcon icon={selectedIcon} />`,
    `React.createElement(IconifyIcon, { icon: "mdi:home" })`,
    `React.createElement(window.IconifyIcon, { icon: "mdi:home" })`,
  ];
  for (const tc of cases) {
    const code = `import React from 'react';\nconst Component = () => { return <div>${tc}</div>; };\nexport default Component;`;
    const result = await replaceIconifyIcons(code);
    console.log('--- CASE ---');
    console.log(tc);
    console.log('MATCH:', result.match(/window\\.IconifyIcon|\\bIconifyIcon\\b/g));
    console.log(result);
  }
}

run().catch(e => { console.error(e); process.exit(1); });

