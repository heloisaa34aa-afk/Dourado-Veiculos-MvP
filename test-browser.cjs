const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:3000/captura-360/token-teste');
  await new Promise(r => setTimeout(r, 4000));
  const body = await page.evaluate(() => document.body.innerHTML);
  console.log("HTML length:", body.length);
  await browser.close();
})();
