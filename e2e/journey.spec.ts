import {test,expect,type Page} from '@playwright/test';
async function discover(page:Page,customer?:string){await page.goto('/');if(customer)await page.locator('.control-panel').getByRole('button',{name:new RegExp(customer)}).click();await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();await page.locator('.recommendation-card button').first().click()}
async function connect(page:Page){const panel=page.locator('.connection-card');await expect(panel.getByRole('button',{name:'동의하고 Agent에게 조회 맡기기'})).toBeDisabled();await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'동의하고 Agent에게 조회 맡기기'}).click();await expect(page.locator('.agent-connected')).toBeVisible()}
async function approveFinance(page:Page){await page.locator('.check-label input').first().check();await page.getByRole('button',{name:'모의 본인인증 하기'}).click();await page.getByRole('button',{name:'동의한 내용으로 모의 실행'}).click()}

test('home has one clear entry and readable buttons at 320, 390 and desktop widths',async({page})=>{
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:width===1440?1050:844});await page.goto('/');
  await expect(page.locator('.bank-welcome .primary')).toHaveCount(1);await expect(page.getByText('샘플·직접 입력으로 진단')).toHaveCount(0);
  const button=page.getByRole('button',{name:'나의 절세 기회 확인하기'});
  expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight)).toBe(true);
  const text=await button.locator('span').boundingBox();expect(text!.height).toBeLessThan(32);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/bank-home-${width}.png`,fullPage:true});
 }
 await page.goto('/#diagnosis');await expect(page.locator('.bank-welcome')).toBeVisible();await expect(page.locator('.mvp-tabs')).toHaveCount(0);
});
test('existing bank information is reused and only missing information needs consent',async({page})=>{
 await discover(page);await expect(page.locator('.known-information')).toContainText('3,000,000원');await expect(page.getByRole('button',{name:'샘플 데이터 조회에 동의'})).toHaveCount(0);
 await connect(page);await expect(page.locator('fieldset')).toHaveCount(1);await expect(page.locator('fieldset')).toContainText('생활비');await page.getByRole('button',{name:'네, 확인했어요'}).click();
 await page.getByRole('button',{name:'납입 내용 확인하기'}).click();await approveFinance(page);await expect(page.getByRole('heading',{name:/개설 완료|납입 완료/})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:/개설 완료|납입 완료/})).toBeVisible();await page.getByRole('button',{name:'자산 현황 확인'}).click();await expect(page.locator('.mini-dashboard')).toContainText('6,420,000');
});
test('first pension opens with existing KYC, then consented extra data supports a deposit',async({page})=>{
 await discover(page,'첫 연금계좌 만들기');await expect(page.locator('.connection-card')).toHaveCount(0);await expect(page.locator('fieldset')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'우리은행이 확인했어요'})).toBeVisible();
 await page.getByRole('button',{name:'개설 내용 확인하기'}).click();await approveFinance(page);await expect(page.getByRole('heading',{name:/개설 완료|납입 완료/})).toBeVisible();
 const openingUrl=page.url();const number=await page.locator('.receipt-account strong').innerText();await expect(page.locator('.bank-receipt')).toContainText('우리 연금저축펀드');await expect(page.locator('.bank-receipt')).toContainText('첫 납입 전');
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:width===1440?1050:844});await page.locator('.app-scroll').evaluate(el=>el.scrollTo(0,0));expect(await page.locator('.bank-result').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:`test-results/pension-open-${width}.png`});}await page.setViewportSize({width:1440,height:1050});
 await page.getByRole('button',{name:'이 계좌에 납입하기'}).click();await connect(page);await page.getByRole('button',{name:'네, 확인했어요'}).click();await page.getByRole('button',{name:'납입 내용 확인하기'}).click();
 await page.locator('.control-panel select').selectOption('fail');await approveFinance(page);await expect(page.getByRole('heading',{name:'납입이 완료되지 않았어요'})).toBeVisible();await expect(page.locator('.live-state')).toContainText('8,420,000');
 await page.reload();await page.getByRole('button',{name:'납입 다시 준비하기'}).click();await approveFinance(page);await expect(page.locator('.live-state')).toContainText('6,420,000');await expect(page.locator('.live-state')).toContainText('1개');
 await expect(page.locator('.bank-receipt')).toContainText('납입 후 계좌 잔액');await expect(page.locator('.bank-receipt')).toContainText('2,000,000원');await page.screenshot({path:'test-results/pension-deposit.png'});
 await page.goto(openingUrl);await expect(page.locator('.receipt-account strong')).toHaveText(number);await expect(page.locator('.receipt-account p')).toHaveText('개설 시 잔액 0원');
 await page.goto('/#benefit');await expect(page.getByRole('heading',{name:'우리은행이 확인했어요'})).toBeVisible();await page.goto('/#action');await expect(page.getByRole('heading',{name:'연금계좌 납입 완료'})).toBeVisible();
});
test('ISA needs additional lookup and a separate external execution consent',async({page})=>{
 await discover(page,'주식은 하는데');await connect(page);await expect(page.locator('fieldset')).toHaveCount(0);await expect(page.locator('.known-information')).toContainText('국내 주식 직접 투자 선호');await page.getByRole('button',{name:'개설 내용 확인하기'}).click();
 await page.locator('.check-label input').first().check();await expect(page.getByRole('button',{name:'모의 본인인증 하기'})).toBeDisabled();await page.locator('.check-label input').nth(1).check();await page.getByRole('button',{name:'모의 본인인증 하기'}).click();await page.getByRole('button',{name:'동의한 내용으로 모의 실행'}).click();await expect(page.getByRole('heading',{name:/개설 완료|납입 완료/})).toBeVisible();await expect(page.locator('.live-state')).toContainText('8,420,000');
 const accountNumber=await page.locator('.receipt-account strong').innerText();
 await page.goto('/#benefit/isa');await page.reload();await expect(page.getByRole('heading',{name:'이미 준비된 ISA가 있어요'})).toBeVisible();await expect(page.getByRole('button',{name:'납입 내용 확인하기'})).toHaveCount(0);await expect(page.locator('.connection-card')).toHaveCount(0);
 await page.getByRole('button',{name:'개설 결과 보기'}).click();await expect(page.locator('.receipt-account strong')).toHaveText(accountNumber);
 const others=await page.evaluate(()=>JSON.parse(localStorage.getItem('won-demo-v1')!).customers.filter((c:{id:string})=>c.id!=='investor'));
 await page.locator('.control-panel select').selectOption('delay');await page.setViewportSize({width:390,height:844});await page.goto('/#benefit/isa');await page.screenshot({path:'test-results/isa-owned.png'});
 await page.getByRole('button',{name:'시연 고객 변경'}).click();page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('dialog').getByRole('button',{name:'이 고객 시나리오 다시 시작'}).click();await expect(page.getByRole('dialog')).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('dialog').getByRole('button',{name:'이 고객 시나리오 다시 시작'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.bank-welcome')).toContainText('박투자');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('won-demo-v1')!).customers);expect(saved.filter((c:{id:string})=>c.id!=='investor')).toEqual(others);expect(saved.find((c:{id:string})=>c.id==='investor').accounts).toHaveLength(0);expect(saved.find((c:{id:string})=>c.id==='investor').actions).toHaveLength(0);
 await page.reload();await page.goto('/#benefit/isa');await connect(page);await page.getByRole('button',{name:'개설 내용 확인하기'}).click();await page.locator('.check-label input').first().check();await page.locator('.check-label input').nth(1).check();await page.getByRole('button',{name:'모의 본인인증 하기'}).click();await page.getByRole('button',{name:'동의한 내용으로 모의 실행'}).click();await expect(page.getByRole('heading',{name:'ISA 개설 완료'})).toBeVisible();
});
test('rent uses bank transfers then consented documents to produce a report',async({page})=>{
 await discover(page,'월세도 놓치지');await expect(page.locator('.known-information')).toContainText('반복 이체 12건');await connect(page);await expect(page.locator('.agent-estimate')).toContainText('1,224,000원');await expect(page.locator('fieldset')).toHaveCount(0);
 await page.getByRole('button',{name:'증빙 준비 맡기기'}).click();await approveFinance(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'샘플 보고서 다운로드'}).click();expect((await download).suggestedFilename()).toContain('샘플증빙');
});
test('housing delayed opening is resolved once and completed account is reused',async({page})=>{
 await discover(page,'내 집을 위한 첫걸음');await connect(page);await page.getByRole('button',{name:'개설 내용 확인하기'}).click();await page.locator('.control-panel select').selectOption('delay');await approveFinance(page);await expect(page.getByRole('heading',{name:'처리 결과 확인 중'})).toBeVisible();await page.reload();await page.getByRole('button',{name:'실행 결과 조회'}).click();await expect(page.getByRole('heading',{name:/개설 완료|납입 완료/})).toBeVisible();await page.getByRole('button',{name:'이 계좌에 납입하기'}).click();await page.getByRole('button',{name:'납입 내용 확인하기'}).click();await approveFinance(page);await expect(page.locator('.live-state')).toContainText('8,220,000');
});
test('grant agent fetches additional data, fills the form and submits after separate consent',async({page})=>{
 await discover(page,'근로장려금 신청 준비');await expect(page.locator('.known-information')).toContainText('수령계좌');await expect(page.locator('input[type=number]')).toHaveCount(0);await connect(page);
 await expect(page.getByRole('button',{name:'Agent에게 신청 맡기기'})).toBeDisabled();await page.locator('.execution-consent input').check();await page.getByRole('button',{name:'간편인증 확인 · 모의'}).click();await page.getByRole('button',{name:'Agent에게 신청 맡기기'}).click();
 await expect(page.getByRole('heading',{name:/장려금 신청 접수 완료/})).toBeVisible();await expect(page.locator('.grant-receipt')).toContainText('SIM-');await expect(page.locator('.grant-receipt')).toContainText('실제 국세청에 전송되거나 접수된 신청은 없습니다');await page.reload();await expect(page.getByRole('heading',{name:/장려금 신청 접수 완료/})).toBeVisible();
 await page.screenshot({path:'test-results/grant-agent-receipt.png',fullPage:true});
});
test('delayed child grant survives reload, prevents duplicate application and keeps cash',async({page})=>{
 await discover(page,'자녀장려금도 챙기기');await connect(page);await page.locator('.control-panel select').selectOption('delay');await page.locator('.execution-consent input').check();await page.getByRole('button',{name:'간편인증 확인 · 모의'}).click();await page.getByRole('button',{name:'Agent에게 신청 맡기기'}).click();await expect(page.getByRole('heading',{name:'접수 결과를 확인하고 있어요'})).toBeVisible();await expect(page.getByRole('button',{name:'Agent에게 신청 맡기기'})).toHaveCount(0);await page.reload();await page.getByRole('button',{name:'접수 결과 조회'}).click();await expect(page.getByRole('heading',{name:/장려금 신청 접수 완료/})).toBeVisible();await expect(page.locator('.live-state')).toContainText('8,600,000');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('won-demo-v1')!));expect(saved.customers.find((c:{id:string})=>c.id==='grant-parent').actions.filter((a:{kind:string})=>a.kind==='grant_submit')).toHaveLength(1);
});
test('remote and bank information stay readable on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'시연 고객 변경'}).click();await page.getByRole('dialog').getByRole('button',{name:/근로장려금 신청 준비/}).click();await page.getByRole('button',{name:'나의 절세 기회 확인하기'}).click();await page.locator('.recommendation-card button').first().click();await connect(page);expect(await page.locator('.known-information dl').evaluate(el=>Array.from(el.children).every(row=>row.getBoundingClientRect().width>=el.clientWidth-2))).toBe(true);await page.screenshot({path:'test-results/grant-agent-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'시연 고객 변경'}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
