import {test,expect} from '@playwright/test';
test('loading leads to multiple personalized recommendations and back skips loading',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();
 await expect(page.locator('.discovery-loading')).toBeVisible();
 await expect(page.getByRole('heading',{name:'김우리님께 맞는 절세 방법을 찾고 있어요'})).toBeVisible();
 await expect(page.locator('.flying-bee')).toBeVisible();
 expect(await page.locator('.flying-bee').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await page.screenshot({path:'test-results/aibee-loading.png'});
 await expect(page.locator('.recommendation-card')).toHaveCount(3);
 await page.screenshot({path:'test-results/recommendations-desktop.png'});
 await page.locator('.recommendation-card button').first().click();
 await expect(page).toHaveURL(/#benefit\/pension$/);await page.getByRole('button',{name:'뒤로 가기'}).click();
 await expect(page.locator('.discovery-results')).toBeVisible();await page.reload();await expect(page.locator('.discovery-results')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/recommendations-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('switching customer cancels analysis and the new scenario gets its own recommendations',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();
 await page.locator('.control-panel').getByRole('button',{name:/주식은 하는데/}).click();
 await page.waitForTimeout(3600);await expect(page.locator('.hero-card')).toBeVisible();
 await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();await expect(page.locator('.recommendation-card').first()).toContainText('ISA');
 await page.locator('.recommendation-card button').first().click();await expect(page).toHaveURL(/#benefit\/isa$/);
});
test('cancel and reduced motion preserve navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();
 await expect(page.locator('.flying-bee')).toHaveCSS('animation-name','none');await page.getByRole('button',{name:'뒤로 가기'}).click();
 await page.waitForTimeout(3600);await expect(page.locator('.hero-card')).toBeVisible();
});
