const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.saucedemo.com');
  await page.fill('[data-test="username"]', 'standard_user');
  await page.fill('[data-test="password"]', 'secret_sauce');
  await page.click('[data-test="login-button"]');
  await page.click('[data-test="add-to-cart-sauce-labs-backpack"]');
  await page.click('.shopping_cart_link');
  await page.waitForLoadState('networkidle');
  
  const buttons = await page.$$eval('button', els => els.map(e => ({ id: e.id, class: e.className, dataTest: e.getAttribute('data-test'), text: e.innerText })));
  const links = await page.$$eval('a', els => els.map(e => ({ id: e.id, class: e.className, dataTest: e.getAttribute('data-test'), text: e.innerText })));
  
  console.log("Buttons:", buttons);
  console.log("Links:", links);
  
  await browser.close();
})();
