// Test Browserless API connection
async function testBrowserlessAPI() {
  const token = '2SuTiuykODr5DXy3b11c16bc36c977d23cef9052f5b8be8cc';
  
  console.log('🔍 Testing Browserless API...');
  
  try {
    // Test the /function endpoint
    const response = await fetch('https://production-sfo.browserless.io/function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        code: `
          module.exports = async ({ page }) => {
            await page.goto('https://www.revolut.com', { waitUntil: 'networkidle0' });
            const title = await page.title();
            return { title };
          };
        `
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ API Error:', response.status, text);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBrowserlessAPI();