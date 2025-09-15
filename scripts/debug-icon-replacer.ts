import { replaceIconifyIcons } from '../src/server/services/render/replace-iconify-icons';

async function main() {
  const cases = [
    `<IconifyIcon icon="mdi:home" />`,
    `<IconifyIcon icon={selectedIcon} />`,
    `React.createElement(IconifyIcon, { icon: "mdi:home" })`,
    `React.createElement(window.IconifyIcon, { icon: "mdi:home" })`,
  ];

  for (const tc of cases) {
    const code = `import React from 'react';
const Component = () => { return <div>${tc}</div>; };
export default Component;`;
    const result = await replaceIconifyIcons(code);
    console.log('--- CASE ---');
    console.log(tc);
    console.log('RESULT:');
    console.log(result);
    console.log('MATCH:', result.match(/window\.IconifyIcon|\bIconifyIcon\b/g));
  }
}

main().catch(e => { console.error(e); process.exit(1); });

