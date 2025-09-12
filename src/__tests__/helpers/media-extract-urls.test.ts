import { MediaValidation } from '../../tools/add/add_helpers/mediaValidation';

describe('MediaValidation.extractMediaUrls', () => {
  test('extracts http/https URLs from JSX src/href', () => {
    const code = `
      const { Img } = window.Remotion;
      export default function S(){
        return (
          <div>
            <Img src="https://example.com/a.png" />
            <a href="http://example.com/page">Link</a>
            <Img src="data:image/png;base64,AAAA" />
            <img src="/relative/path.png" />
          </div>
        );
      }
    `;
    const urls = MediaValidation.extractMediaUrls(code);
    expect(urls).toContain('https://example.com/a.png');
    expect(urls).toContain('http://example.com/page');
    expect(urls.find(u => u.startsWith('data:'))).toBeUndefined();
    expect(urls.find(u => u.startsWith('/relative'))).toBeUndefined();
  });

  test('extracts http/https URLs from CSS url(...)', () => {
    const code = `
      const bg = {
        backgroundImage: 'url("https://cdn.cdn.com/bg.jpg")',
      };
      const other = {
        backgroundImage: 'url(/relative.jpg)',
      };
    `;
    const urls = MediaValidation.extractMediaUrls(code);
    expect(urls).toContain('https://cdn.cdn.com/bg.jpg');
    expect(urls.find(u => u === '/relative.jpg')).toBeUndefined();
  });
});

