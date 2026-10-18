import {isGrant,GRANT_TITLES,GRANT_SOURCES,getGrant,evaluateGrant,type GrantDraft,type GrantKind} from './grants';
export type Benefit = 'pension'|'isa'|'housing'|'rent'|'card'|'sme'|GrantKind;
export type Status = 'draft'|'awaiting_consent'|'ready'|'running'|'success'|'failed'|'unknown'|'cancelled'|'deferred';
export type Mode = 'normal'|'fail'|'delay';
export interface Account {id:string;kind:Benefit;name:string;balance:number;contributed:number}
export interface Action {id:string;benefit:Benefit;kind:'open'|'deposit'|'report'|'grant_prepare';amount:number;status:Status;revision:number;approvedRevision?:number;consent:boolean;externalConsent:boolean;authenticated:boolean;label:string;provider:string;created:string;result?:string;accountId?:string;reportSnapshot?:string}
export interface Customer {id:string;name:string;title:string;subtitle:string;focus:Benefit;salary:number;cash:number;budget:number;accounts:Account[];answers:Record<string,string>;actions:Action[];readConsent:boolean;year:number;revision:number;grants?:Partial<Record<GrantKind,GrantDraft>>}
export interface Question {key:string;label:string;options:[string,string][]}
export const titles:Record<Benefit,string>={pension:'연금계좌',isa:'ISA',housing:'주택청약',rent:'월세 세액공제',card:'카드 소득공제',sme:'중소기업 취업 감면',...GRANT_TITLES};
export const statusLabels:Record<Status,string>={draft:'작성 중',awaiting_consent:'동의 대기',ready:'실행 준비',running:'처리 중',success:'모의 실행 완료',failed:'실행 실패',unknown:'결과 확인 필요',cancelled:'취소',deferred:'보류'};
const yesNo:[string,string][]=[['yes','네, 확인했어요'],['no','아니요'],['unknown','잘 모르겠어요']];
export const questions:Record<Benefit,Question[]>={
 grant_work:[],grant_child:[],
 pension:[{key:'otherPension',label:'타행 연금·IRP·DC 개인부담금이 없나요?',options:yesNo},{key:'liquid',label:'이 예산은 가까운 시일에 사용할 생활비가 아닌가요?',options:yesNo},{key:'eligible',label:'국내 거주 근로소득자이며 본인 명의 가입인가요?',options:yesNo}],
 isa:[{key:'noIsa',label:'다른 금융기관에도 ISA 계좌가 없나요?',options:yesNo},{key:'isaEligible',label:'만 19세 이상 국내 거주자로, 직전 3개 과세기간 금융소득종합과세 대상이 아니었나요?',options:yesNo},{key:'invest',label:'ISA에서 어떤 투자를 하고 싶으세요?',options:[['stock','국내 상장주식 직접 투자'],['trust','은행 신탁형 상품 운용'],['unknown','아직 결정하지 못했어요']]}],
 housing:[{key:'noHousing',label:'타행에도 청약통장이 없나요?',options:yesNo},{key:'homeless',label:'무주택 세대의 적격 세대주 또는 배우자인가요?',options:yesNo},{key:'eligible',label:'국내 거주 근로소득자이며 본인 명의 가입인가요?',options:yesNo}],
 rent:[{key:'address',label:'임대차 계약서와 주민등록 주소가 같나요?',options:yesNo},{key:'rentEligible',label:'연중 근로·본인 계약·무주택 세대주·30㎡ 주택·관리비 별도 조건이 맞나요?',options:yesNo},{key:'documents',label:'샘플 계약서와 주소 확인 자료가 준비되어 있나요?',options:yesNo}],
 card:[{key:'noChildren',label:'자녀 없는 일반 국내 사용분 계산 대상인가요?',options:yesNo}],sme:[{key:'company',label:'회사의 적격 업종과 감면 신청 여부를 확인했나요?',options:yesNo}]
};
export const sources:Record<Benefit,{label:string;url:string;note:string}>={
 grant_work:{label:'국세청 · 근로장려금 신청자격',url:GRANT_SOURCES.eligibility,note:'정부지원금 · 2025년 부부합산 총소득과 가구원 재산 확인. 지급액 확정 아님.'},
 grant_child:{label:'국세청 · 자녀장려금 신청자격',url:GRANT_SOURCES.eligibility,note:'정부지원금 · 적격 부양자녀·가구 소득·재산 확인. 세액공제와 합산하지 않음.'},
 pension:{label:'국세청 · 연금계좌 세액공제',url:'https://webtv.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7875&mi=6439',note:'국세 기준 15% / 12%. 연금저축 600만원, 합산 900만원 한도.'},
 isa:{label:'우리은행 · 신탁형 ISA 안내',url:'https://spot.wooribank.com/pot/Dream?withyou=IMISA0044',note:'일반형 적격 순이익 비과세 한도 200만원. 가입만으로 절세액이 발생하지 않습니다.'},
 rent:{label:'조세특례제한법 · 월세액 세액공제',url:'https://www.law.go.kr/법령/조세특례제한법/제95조의2',note:'표준 샘플의 국세 공제 계산. 특례·비표준 사례는 전문 검토가 필요합니다.'},
 housing:{label:'조세특례제한법 · 주택청약',url:'https://www.law.go.kr/법령/조세특례제한법/제87조',note:'샘플 규칙: 납입 300만원 한도의 40%. 소득공제이며 환급액이 아닙니다.'},
 card:{label:'조세특례제한법 · 카드 사용액',url:'https://www.law.go.kr/법령/조세특례제한법/제126조의2',note:'총급여 25% 초과 일반 국내 사용분. 확장 사례는 계산 보류.'},
 sme:{label:'조세특례제한법 · 중소기업 취업자',url:'https://www.law.go.kr/법령/조세특례제한법/제30조',note:'회사 업종·최초 취업일·기적용 여부 확인 필요. 금액 계산은 제공하지 않습니다.'}
};
export function fixtures():Customer[]{
 const base={salary:40_000_000,cash:8_420_000,budget:2_000_000,readConsent:false,year:2026,revision:0,actions:[]};
 const account=(kind:Benefit,amount:number):Account=>({id:`demo-${kind}`,kind,name:kind==='pension'?'우리 연금저축펀드':'주택청약종합저축',balance:amount,contributed:amount});
 return [
 {...base,id:'pension',name:'김우리',title:'연금에 더하는 절세',subtitle:'연금 보유 · 첫 직장 3년 차',focus:'pension',accounts:[account('pension',3_000_000),account('housing',2_400_000)],answers:{}},
 {...base,id:'new-pension',name:'이시작',title:'첫 연금계좌 만들기',subtitle:'연금 미보유 · 사회초년생',focus:'pension',accounts:[],answers:{}},
 {...base,id:'investor',name:'박투자',title:'주식은 하는데, ISA는?',subtitle:'주식 투자 중 · ISA 미보유',focus:'isa',accounts:[],answers:{}},
 {...base,id:'housing',name:'정내집',title:'내 집을 위한 첫걸음',subtitle:'청약 미가입 · 무주택 직장인',focus:'housing',budget:200_000,accounts:[],answers:{}},
 {...base,id:'renter',name:'최월세',title:'월세도 놓치지 않도록',subtitle:'월세 60만원 · 연중 거주',focus:'rent',accounts:[account('housing',2_400_000)],answers:{}},
 {...base,id:'unknown',name:'한확인',title:'모르면, 함께 확인해요',subtitle:'타행 납입 · 주거 정보 미확인',focus:'pension',accounts:[],answers:{otherPension:'unknown',address:'unknown'},budget:0},
 {...base,id:'grant-worker',name:'윤도움',title:'근로장려금 신청 준비',subtitle:'급여 입금 고객 · 가구 조건 추가 확인',focus:'grant_work',salary:18_000_000,cash:2_100_000,budget:0,accounts:[],answers:{}},
 {...base,id:'grant-parent',name:'장가족',title:'자녀장려금도 챙기기',subtitle:'자녀 양육 가구 · 정부지원 확인',focus:'grant_child',salary:32_000_000,cash:8_600_000,budget:0,accounts:[],answers:{}}
 ] as Customer[];
}
export function pensionCredit(pension:number,irp=0,salary=40_000_000){return Math.floor(Math.min(Math.min(pension,6_000_000)+irp,9_000_000)*(salary<=55_000_000?15:12)/100)}
export function rentCredit(amount:number,salary:number,address:string){return address==='yes'&&salary<=80_000_000?Math.floor(Math.min(amount,10_000_000)*(salary<=55_000_000?17:15)/100):null}
export function housingDeduction(amount:number,loanDeduction=0){return Math.max(0,Math.min(Math.min(amount,3_000_000)*.4,4_000_000-loanDeduction))}
export function cardDeduction(salary:number,credit:number,debit:number,children=false){if(children)return null;const threshold=salary*.25;return Math.floor(Math.min(Math.max(0,credit-threshold)*.15+Math.max(0,debit-Math.max(0,threshold-credit))*.3,salary<=70_000_000?3_000_000:2_500_000))}
export function availability(product:string,date='2026-10-17'){return product==='youth-leap'?'discontinued':product==='youth-future'?(date>'2026-10-16'?'closed':'unknown'):'open'}
export function normalizeTransactions(rows:{id:string;amount:number;cancelled?:boolean;rentClaimed?:boolean}[]){return [...new Map(rows.map(r=>[r.id,r])).values()].filter(r=>!r.cancelled&&!r.rentClaimed)}
export function analyze(c:Customer,b:Benefit){
 if(isGrant(b)){const e=evaluateGrant(getGrant(c,b),b);return {missing:[],reason:e.reason,value:null,eligible:e.status==='candidate',amountType:'정부지원금 · 지급액 미확정'}}
 const missing=questions[b].filter(q=>!c.answers[q.key]||c.answers[q.key]==='unknown');
 const negative=questions[b].find(q=>c.answers[q.key]==='no');
 let reason=!c.readConsent?'샘플 데이터 조회 동의가 필요해요.':c.year!==2026?'해당 연도의 규칙은 검토가 필요해요.':c.salary<=0&&b!=='isa'?'근로소득 확인이 필요해요.':negative?`${negative.label} 조건을 다시 확인해 주세요.`:missing.length?'필요한 정보만 확인하면 다음 단계로 갈 수 있어요.':'';
 if(b==='sme')reason='회사 업종·최초 감면 취업일·신청 여부를 회사 담당자에게 확인해 주세요.';
 if(b==='housing'&&c.salary>70_000_000)reason='이 체험의 청약 소득공제 소득 범위를 벗어나요.';
 if(b==='rent'&&c.salary>80_000_000)reason='월세 세액공제 소득 범위를 벗어나요.';
 const p=c.accounts.find(a=>a.kind==='pension')?.contributed||0;
 const value=reason?null:b==='rent'?rentCredit(7_200_000,c.salary,c.answers.address):b==='housing'?housingDeduction(c.accounts.find(a=>a.kind==='housing')?.contributed||0):b==='pension'?pensionCredit(p,0,c.salary):b==='card'?cardDeduction(c.salary,12_000_000,3_000_000):null;
 return {missing,reason,value,eligible:!reason,amountType:b==='housing'||b==='card'?'소득공제 계산액':'국세 세액공제 계산액'};
}
export function answerQuestion(c:Customer,key:string,value:string):Customer{return {...c,answers:{...c.answers,[key]:value},revision:c.revision+1,actions:c.actions.map(a=>['draft','awaiting_consent','ready','deferred'].includes(a.status)?{...a,...(a.benefit==='isa'&&key==='invest'?{label:value==='stock'?'중개형 ISA 개설':'신탁형 ISA 개설',provider:value==='stock'?'외부 증권사 연계 체험':'우리은행 체험'}:{}),status:'draft',consent:false,externalConsent:false,authenticated:false,approvedRevision:undefined}:a)}}
// Opening an account and qualifying for a tax deduction are distinct decisions.
export function executionReadiness(c:Customer,b:Benefit){
 if(isGrant(b)){const e=evaluateGrant(getGrant(c,b),b);return {ready:e.canPrepare,reason:e.reason,missing:[],requiredKeys:[],opening:false}}
 const opening=!c.accounts.some(a=>a.kind===b)&&['pension','housing','isa'].includes(b);
 const required=opening?questions[b].filter(q=>b==='pension'?q.key==='eligible':b==='housing'?['noHousing','eligible'].includes(q.key):true):questions[b];
 const missing=required.filter(q=>!c.answers[q.key]||c.answers[q.key]==='unknown');
 let reason='';
 if(!c.readConsent)reason='먼저 샘플 데이터 조회에 동의해 주세요.';
 else if(c.year!==2026)reason='2026년 체험을 선택해 주세요. 다른 연도는 규칙 확인이 필요해요.';
 else if(missing.length)reason=`아직 ${missing.length}가지 확인이 남았어요: ${missing.map(q=>q.label).join(' / ')}`;
 else if(required.some(q=>c.answers[q.key]==='no'))reason='선택한 조건으로는 이 실행을 진행할 수 없어요. 아래 응답을 확인해 주세요.';
 else if(!opening&&!analyze(c,b).eligible)reason=analyze(c,b).reason;
 if(b==='isa'&&c.accounts.some(a=>a.kind==='isa'))reason='이미 ISA 계좌가 있어요. 실행내역에서 개설 결과를 확인해 주세요.';
 if(c.actions.some(a=>['unknown','running'].includes(a.status)))reason='이전 실행의 결과 확인이 필요해요. 실행내역에서 결과를 먼저 조회해 주세요.';
 return {ready:!reason,reason,missing,requiredKeys:required.map(q=>q.key),opening};
}
export function previewAction(c:Customer,b:Benefit,amount:number):Action{
 const account=c.accounts.find(a=>a.kind===b);const kind=b==='rent'?'report':account?'deposit':'open';
 const external=b==='isa'&&c.answers.invest==='stock';
 return {id:crypto.randomUUID(),benefit:b,kind,amount:kind==='deposit'?amount:0,status:'awaiting_consent',revision:c.revision,consent:false,externalConsent:false,authenticated:false,label:kind==='report'?'월세 증빙 준비 보고서':`${b==='isa'?(external?'중개형 ISA':'신탁형 ISA'):titles[b]} ${kind==='open'?'개설':'납입'}`,provider:external?'외부 증권사 연계 체험':'우리은행 체험',created:new Date().toISOString(),accountId:account?.id};
}
export function guard(c:Customer,a:Action){
 if(isGrant(a.benefit)||a.kind==='grant_prepare')return '정부지원은 신청 준비 화면에서 진행해 주세요. 금융거래로 실행하지 않아요.';
 if(c.actions.some(x=>x.id!==a.id&&['unknown','running'].includes(x.status)))return '진행 중인 실행 결과를 먼저 확인해 주세요.';
 const readiness=executionReadiness({...c,actions:c.actions.filter(x=>x.id!==a.id)},a.benefit);if(!readiness.ready)return readiness.reason;
 if(['card','sme'].includes(a.benefit))return '이 항목은 안내와 확인만 지원해요.';
 if(a.benefit==='isa'&&a.kind!=='open')return 'ISA 납입·투자 주문은 이번 체험 범위 밖이에요.';
 if(a.kind==='open'&&c.accounts.some(x=>x.kind===a.benefit))return '이미 보유한 계좌가 있어요. 중복 개설할 수 없어요.';
 if(a.kind==='deposit'){
 if(!c.accounts.some(x=>x.id===a.accountId))return '대상 계좌가 없어요.';
 if(!Number.isSafeInteger(a.amount)||a.amount<=0)return '납입 금액을 확인해 주세요.';
 if(a.amount>c.budget||a.amount>c.cash)return '가용 예산 또는 출금 잔액을 초과했어요.';
 if(a.benefit==='pension'&&a.amount+(c.accounts.find(x=>x.kind==='pension')?.contributed||0)>6_000_000)return '이 체험에서는 연금저축 공제대상 600만원 범위만 납입해요.';
 }
 return '';
}
export function approveAction(c:Customer,a:Action,consent:boolean,external:boolean,auth:boolean):Action{
 const error=guard(c,a);if(error)throw new Error(error);if(!consent||!auth||(a.provider.startsWith('외부')&&!external))throw new Error('개별 실행 동의와 모의 인증이 필요해요.');
 return {...a,status:'ready',consent,externalConsent:external,authenticated:auth,approvedRevision:c.revision};
}
export function executeAction(c:Customer,id:string,mode:Mode):Customer{
 const a=c.actions.find(x=>x.id===id);if(!a||a.status!=='ready')return c;
 const error=guard(c,a);if(error||a.approvedRevision!==c.revision||!a.consent||!a.authenticated)return {...c,actions:c.actions.map(x=>x.id===id?{...x,status:'draft',result:error||'정보가 변경되어 다시 동의해야 해요.'}:x)};
 if(mode==='delay')return {...c,actions:c.actions.map(x=>x.id===id?{...x,status:'unknown',result:'응답이 지연되었어요. 다시 실행하지 말고 결과를 조회해 주세요.'}:x)};
 if(mode==='fail'&&a.kind==='deposit')return {...c,actions:c.actions.map(x=>x.id===id?{...x,status:'failed',result:'모의 납입 실패. 계좌와 잔액은 유지되었어요.'}:x)};
 return settle(c,a);
}
function settle(c:Customer,a:Action):Customer{
 let accounts=c.accounts;let cash=c.cash;let budget=c.budget;
 if(a.kind==='open')accounts=[...accounts,{id:`SIM-${a.id.slice(0,8)}`,kind:a.benefit,name:a.label.replace(' 개설',''),balance:0,contributed:0}];
 if(a.kind==='deposit'){accounts=accounts.map(x=>x.id===a.accountId?{...x,balance:x.balance+a.amount,contributed:x.contributed+a.amount}:x);cash-=a.amount;budget-=a.amount;}
 return {...c,accounts,cash,budget,actions:c.actions.map(x=>x.id===a.id?{...x,status:'success',reportSnapshot:a.kind==='report'?reportText(c):undefined,result:a.kind==='report'?'샘플 증빙 준비 완료 · 실제 제출 전':a.kind==='open'?'모의 계좌 개설 완료 · 납입 및 투자 별도':'모의 납입 완료 · 투자 상품 매수 없음'}:x)};
}
export function getActionResult(c:Customer,id:string):Customer{const a=c.actions.find(x=>x.id===id);if(a?.status!=='unknown')return c;const error=guard(c,a);if(error)return {...c,actions:c.actions.map(x=>x.id===id?{...x,status:'failed',result:`모의 실행 미처리: ${error}`}:x)};return settle(c,a)}
export function reportText(c:Customer){return `WON 세금비서 | 샘플 증빙 준비 보고서\n가상 고객: ${c.name}\n귀속연도: ${c.year}\n12개월 월세: 7,200,000원 (관리비 제외)\n`+Array.from({length:12},(_,i)=>`${i+1}월 | DEMO-RENT-${i+1} | 600,000원 | 샘플 이체`).join('\n')+`\n계약·주소 자료: ${c.answers.documents==='yes'?'샘플 확인':'미준비'}\n국세 세액공제 계산액: ${rentCredit(7_200_000,c.salary,c.answers.address)??'확인 필요'}\n공식 은행 증명서가 아닙니다. 회사 제출·세금 신고는 수행되지 않았습니다.`}
