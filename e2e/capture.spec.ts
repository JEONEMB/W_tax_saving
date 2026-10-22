import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';

test('remote opens all seven scenes directly, preserves state, and returns to the app',async({page})=>{
 await page.goto('/');
 const before=await page.evaluate(()=>localStorage.getItem('won-demo-v1'));
 await page.getByRole('link',{name:'리모콘 V2 · 캡처'}).click();
 for(const [id,title] of [['a1','내 유형과 맞춤 추천'],['a2','버튼 반영 재계산'],['a3','납입 결과·남은 한도'],['b1','상황 버튼 선택'],['b2','계획 재계산'],['c1','월세 계약과 이체 내역 확인'],['c2','근로장려금 신청 전 확인']]){
  await page.locator('.capture-remote').getByRole('button',{name:new RegExp(title)}).click();
  await expect(page).toHaveURL(new RegExp(`#capture/${id}$`));
  await expect(page.locator('.cap-panel')).toHaveCount(1);
  await expect(page.locator('.cap-panel-heading h3')).toHaveText(title);
 }
 await page.reload();await expect(page.locator('.cap-panel-heading h3')).toHaveText('근로장려금 신청 전 확인');
 expect(await page.evaluate(()=>localStorage.getItem('won-demo-v1'))).toBe(before);
 await page.getByRole('link',{name:'← 기존 체험으로'}).click();
 await expect(page.locator('.phone')).toBeVisible();
});

for(const [id,height,count,phrases] of [
 ['a',710,3,['월세 사는 사회초년생형','총급여 약 4,000만 원','300,000원','282,000원','1,800,000원','1,200,000원','400,000원','승인하고 인증하기']],
 ['b',470,2,['내년 봄','80만 원 남기기','1,000,000원','200,000원','800,000원','162,000원','282,000원','2027년 봄','변경된 계획으로 다시 승인']],
 ['c',470,2,['본인확인 완료','600,000원','반복 이체 12건','참고 정보','손택스에서 신청하기','은행이 신청서를 대신 작성하지 않아요']],
] as const){
 test(`board ${id} matches copy, fits panels, and exports exact PNG size`,async({page})=>{
  await page.goto(`/#capture/${id}`);
  const board=page.getByTestId('capture-board');
  await expect(board.locator('.cap-panel')).toHaveCount(count);
  for(const phrase of phrases)await expect(board).toContainText(phrase);
  const overflow=await board.locator('.cap-panel').evaluateAll(panels=>panels.flatMap(panel=>{
   const body=panel.querySelector('.cap-panel-body')!;
   const footer=panel.querySelector('footer')!.getBoundingClientRect();
   return Array.from(body.children).filter(child=>child.getBoundingClientRect().bottom>footer.top+1).map(child=>child.textContent);
  }));
  expect(overflow).toEqual([]);
  await expect(board).not.toContainText('세금 효과는 같고');
  await expect(board).not.toContainText('연금저축펀드');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:/PNG 저장/}).click();
  const download=await downloadPromise;
  mkdirSync(resolve('captures/v3.3'),{recursive:true});
  const path=resolve('captures/v3.3',download.suggestedFilename());await download.saveAs(path);
  const bytes=readFileSync(path);expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(2080);expect(bytes.readUInt32BE(20)).toBe(height);expect(bytes.length).toBeGreaterThan(20000);
 });
}

test('small viewport only scales preview; export remains full resolution',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/#capture/b');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:/PNG 저장/}).click();
 const download=await downloadPromise;const path=test.info().outputPath('mobile.png');await download.saveAs(path);
 const bytes=readFileSync(path);expect(bytes.readUInt32BE(16)).toBe(2080);expect(bytes.readUInt32BE(20)).toBe(470);
});
