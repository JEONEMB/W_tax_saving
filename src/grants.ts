import type {Customer,Action,Mode} from './domain';

export type GrantKind='grant_work'|'grant_child';
export interface GrantDraft {consent:boolean;step:number;answers:Record<string,string>;date:string;prepareConsent:boolean;payoutConfirmed:boolean;preparedId?:string;revision:number;submitConsent?:boolean;authenticated?:boolean;submittedId?:string}
export const GRANT_TITLES:Record<GrantKind,string>={grant_work:'근로장려금',grant_child:'자녀장려금'};
export const GRANT_SOURCES={eligibility:'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7783&mi=2449',application:'https://in.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=238977&mi=40397',hometax:'https://www.hometax.go.kr/'};
export const GRANT_RULE_VERSION='2025-income.2026-10-17';
export const isGrant=(b:string):b is GrantKind=>b==='grant_work'||b==='grant_child';
export const newGrantDraft=():GrantDraft=>({consent:false,step:0,answers:{},date:'2026-10-17',prepareConsent:false,payoutConfirmed:false,revision:0});
export const getGrant=(c:Customer,b:GrantKind)=>c.grants?.[b]??newGrantDraft();
export interface GrantQuestion {key:string;label:string;help:string;options?:[string,string][];numeric?:boolean}
const unknown:[string,string]=['unknown','모르겠어요'];
export function grantQuestionGroups(b:GrantKind):GrantQuestion[][]{return [
 [{key:'household',label:'2025년 말 기준 가구 유형',help:'단독: 배우자·부양자녀·70세 이상 부양 직계존속 없음. 홑벌이: 배우자 총급여액 등 300만원 미만 또는 적격 부양가족 있음. 맞벌이: 본인과 배우자 각각 총급여액 등 300만원 이상. 애매하면 모름을 선택해 주세요.',options:[['single','단독가구'],['one','홑벌이가구'],['dual','맞벌이가구'],unknown]},
 {key:'incomeType',label:'2025년에 발생한 소득',help:'급여 외 사업·종교인 소득이 있으면 해당 유형을 선택하세요. 사업소득의 업종별 조정은 이 체험에서 확정하지 않아요.',options:[['earned','근로소득 있음 · 사업/종교인 소득 없음'],['business','사업소득 포함'],['religious','종교인 소득 포함'],['none','해당 소득 없음'],unknown]},
 {key:'totalIncome',label:'2025년 본인·배우자 연간 총소득 (원)',help:'국세청 자료로 확인한 합산액을 입력해 주세요. 세전 급여와 이자·배당·연금·기타소득 등을 포함하며 은행 입금 합계와 다릅니다. 모르면 비워 두세요.',numeric:true}],
 [{key:'assets',label:'2025년 6월 1일 가구원 합산 재산 (원)',help:'주택·토지·차량·전세금·타행 예금·증권 등을 포함합니다. 부채를 빼지 마세요. 모르면 비워 두세요.',numeric:true},
 {key:'assetCoverage',label:'가구 전체 재산과 평가 기준을 확인했나요?',help:'현재 잔액이나 우리은행 잔액만으로 판정하지 않아요. 전세금 평가·가족 간 임대차 등 특례가 있으면 추가 검토를 선택해 주세요.',options:[['complete','전체 재산과 평가 기준 확인'],['review','특례 또는 평가 확인 필요'],unknown]},
 {key:'exclusions',label:'신청 제외 요건에 해당하지 않나요?',help:`2025년 말 국적 요건(배우자·자녀 예외 포함), 타인의 부양자녀 여부, 본인·배우자의 전문직 사업 여부를 확인합니다.${b==='grant_work'?' 근로장려금은 해당 상용근로자의 월평균 급여 500만원 이상 제외 요건도 확인해 주세요.':''}`,options:[['clear','제외 요건에 해당하지 않음'],['applies','제외 요건에 해당함'],unknown]}],
 [{key:'already',label:'2025년 소득분 장려금을 이미 신청했나요?',help:'반기·정기·기한 후·자동신청 내역을 공식 경로에서 확인해 주세요. 은행의 입금 기록만으로 신청 여부를 판단하지 않아요.',options:[['not','아직 신청하지 않음'],['submitted','이미 신청함'],['auto','자동신청된 것을 확인함'],unknown]},
 {key:'notice',label:'국세청 신청 안내문을 받았나요?',help:'안내문을 받지 않았어도 요건에 맞으면 직접 신청할 수 있어요. 인증번호·주민등록번호는 이 앱에 입력하지 마세요.',options:[['yes','안내문 있음'],['no','안내문 없음'],unknown]},
 ...(b==='grant_child'?[{key:'childEligible',label:'적격 부양자녀가 있나요?',help:'원칙적으로 18세 미만·연간 소득금액 100만원 이하 등 부양 요건을 확인해 주세요. 장애인 연령 예외·부양 관계 특례는 추가 검토로 분기합니다.',options:[['yes','표준 요건의 부양자녀 있음'],['no','적격 부양자녀 없음'],['review','특례 확인 필요'],unknown]} as GrantQuestion]:[])]
 ]}
export function grantWindow(date:string){
 if(!/^2026-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)return {open:false,label:'기간 재확인 필요',note:'이 체험은 2026년 신청 일정만 검증했어요.'};
 if(date<'2026-05-01')return {open:false,label:'정기신청 전',note:'2025년 소득 정기신청: 2026.05.01 ~ 06.01'};
 if(date<='2026-06-01')return {open:true,label:'정기신청 기간',note:'2025년 소득 · 2026.05.01 ~ 06.01'};
 if(date<='2026-12-01')return {open:true,label:'기한 후 신청 기간',note:'2025년 소득 · 2026.06.02 ~ 12.01. 기한 후 신청의 감액 등은 공식 안내에서 확인하세요.'};
 return {open:false,label:'기한 후 신청 종료',note:'2025년 소득분 신청 기간이 종료됐어요. 새로운 귀속연도 일정은 공식 안내에서 확인해 주세요.'};
}
export function evaluateGrant(d:GrantDraft,b:GrantKind){
 const qs=grantQuestionGroups(b).flat();const missing=qs.filter(q=>!d.answers[q.key]||d.answers[q.key]==='unknown'||(q.numeric&&(!Number.isSafeInteger(Number(d.answers[q.key]))||Number(d.answers[q.key])<0)));
 const a=d.answers;let status:'needs_info'|'ineligible'|'review_required'|'candidate'|'already_applied'='candidate';let reason='입력 기준 신청 가능 후보예요. 최종 자격과 지급액은 국세청이 확인합니다.';
 const limits:Record<string,number>={single:22_000_000,one:32_000_000,dual:44_000_000};const incomeLimit=b==='grant_child'?70_000_000:limits[a.household];
 if(!d.consent){status='needs_info';reason='신청 준비를 위한 샘플 데이터 이용에 동의해 주세요.'}
 else if(['submitted','auto'].includes(a.already)){status='already_applied';reason='기신청 내역을 먼저 확인해 주세요. 중복 신청 준비는 진행하지 않아요.'}
 else if(missing.length){status='needs_info';reason=`아직 ${missing.length}개 항목의 확인이 필요해요. 모르는 정보는 임의로 채우지 않아요.`}
 else if(!incomeLimit||!['single','one','dual'].includes(a.household)||!['earned','business','religious','none'].includes(a.incomeType)||!['complete','review'].includes(a.assetCoverage)||!['clear','applies'].includes(a.exclusions)||a.already!=='not'||!['yes','no'].includes(a.notice)){status='review_required';reason='입력값을 다시 확인해 주세요.'}
 else if(a.incomeType==='none'||Number(a.totalIncome)===0||Number(a.totalIncome)>=incomeLimit||Number(a.assets)>=240_000_000||a.exclusions==='applies'||(b==='grant_child'&&(a.household==='single'||a.childEligible==='no'))){status='ineligible';reason='입력한 조건은 기본 신청요건을 충족하지 않아요. 공식 자격 안내에서 다시 확인해 주세요.'}
 else if(a.incomeType!=='earned'||a.assetCoverage==='review'||(b==='grant_child'&&a.childEligible!=='yes')){status='review_required';reason='사업·종교인 소득 조정 또는 가족·재산 특례는 추가 검토가 필요해요.'}
 const warning=Number(a.assets)>=170_000_000&&Number(a.assets)<240_000_000?'재산 구간에 따라 산정액의 50% 지급 대상일 수 있어요.':'';
 return {status,reason,missing,incomeLimit,warning,canPrepare:status==='candidate'&&grantWindow(d.date).open};
}
export function bankGrantData(c:Customer){
 const available=['grant-worker','grant-parent'].includes(c.id);
 const monthly=c.id==='grant-worker'?1_350_000:2_400_000;
 const credits=available?Array.from({length:12},(_,i)=>({id:`DEMO-2025-SALARY-${i+1}`,date:`2025-${String(i+1).padStart(2,'0')}-25`,amount:monthly,description:'급여 추정 입금'})):[];
 return {credits,creditTotal:credits.reduce((sum,r)=>sum+r.amount,0),name:c.name,account:'우리 WON통장 · SIM-1002-•••-0707',contact:'010-****-0707 (가상 연락처)',snapshot:available?(c.id==='grant-worker'?1_400_000:8_600_000):null,snapshotDate:'2025-06-01',available};
}
export function updateGrant(c:Customer,b:GrantKind,patch:Partial<GrantDraft>):Customer{
 if(patch.consent===false)return revokeGrant(c,b);
 const d=getGrant(c,b);const material=['answers','date','consent','payoutConfirmed'].some(key=>key in patch);
 const next={...d,...patch,...(material?{revision:d.revision+1,preparedId:undefined,prepareConsent:false,submitConsent:false,authenticated:false}:{} ),...(['answers','date','consent'].some(key=>key in patch)?{payoutConfirmed:false}:{}),...(patch.submitConsent===false?{authenticated:false}:{})};
 let actions:Action[]=material?c.actions.map(a=>a.benefit===b&&a.kind==='grant_prepare'?{...a,status:'deferred',reportSnapshot:undefined,result:'정보 변경 · 신청 준비를 다시 확인해 주세요.'}:a):c.actions;
 if(patch.consent===true&&!actions.some(a=>a.benefit===b&&a.kind==='grant_prepare'))actions=[{id:crypto.randomUUID(),benefit:b,kind:'grant_prepare',amount:0,status:'draft',revision:next.revision,consent:true,externalConsent:false,authenticated:false,label:`${GRANT_TITLES[b]} 신청 준비`,provider:'앱 내 준비 · 국세청 직접 신청',created:new Date().toISOString(),result:'신청 준비 중 · 공식 접수 전'},...actions];
 return {...c,grants:{...c.grants,[b]:next},actions};
}
export function grantReport(c:Customer,b:GrantKind,d:GrantDraft){
 const bank=bankGrantData(c),evaluation=evaluateGrant(d,b);
 return [`WON 세금비서 · ${GRANT_TITLES[b]} 신청 준비 자료 (가상 데이터)`,`공식 신청서·접수증 아님 / 외부 전송 없음`,`생성 기준일: ${d.date} / 소득연도: 2025 / 재산기준일: 2025-06-01`,`규칙: ${GRANT_RULE_VERSION}`,`상태: ${evaluation.status} · ${evaluation.reason}`,
 '[은행에서 정리한 샘플]',`이름: ${bank.name}`,`본인 명의 계좌 후보: ${bank.account}`,`등록 연락처: ${bank.contact}`,`기준일 자행 예금 잔액: ${bank.snapshot??'자료 없음'}`,`급여 추정 입금 합계: ${bank.creditTotal}원 (총소득 아님)`,...bank.credits.map(r=>`${r.id} / ${r.date} / ${r.amount}원 / ${r.description}`),
 '[고객이 추가 확인한 정보]',...grantQuestionGroups(b).flat().map(q=>`${q.label}: ${q.options?.find(([v])=>v===d.answers[q.key])?.[1]||d.answers[q.key]||'미확인'}`),`수령 계좌 후보 확인: ${d.payoutConfirmed?'확인':'미확인'}`,`앱 내 신청 준비 동의: ${d.prepareConsent?'동의':'미동의'}`,
 '[공식 신청에서 해야 할 일]','본인인증 → 2025년 소득분 정기/기한 후 신청 → 소득·재산 확인 → 연락처·실제 수령계좌 확인 → 최종 신청',d.answers.notice==='yes'?'안내문에 따른 신청 경로를 이용하세요. 개별인증번호는 공식 화면에서만 입력하세요.':'안내문 없이 직접입력 신청 경로를 확인하세요.',
 '가상 계좌·연락처를 실제 홈택스에 입력하지 마세요. 실제 정보를 공식 화면에서 확인해야 합니다.','이 앱의 동의는 홈택스 제출 동의나 국세청 자동신청 동의가 아닙니다.',`신청 경로: ${GRANT_SOURCES.hometax}`,`자격 근거: ${GRANT_SOURCES.eligibility}`,`신청 안내: ${GRANT_SOURCES.application}`].join('\n');
}
export function prepareGrant(c:Customer,b:GrantKind):Customer{
 const d=getGrant(c,b);const evaluation=evaluateGrant(d,b);
 if(!evaluation.canPrepare)throw new Error(evaluation.reason+' '+(!grantWindow(d.date).open?grantWindow(d.date).note:''));
 if(!d.prepareConsent||!d.payoutConfirmed)throw new Error('정리된 내용·수령 계좌 후보 확인과 신청 준비 동의가 필요해요.');
 if(d.preparedId&&c.actions.some(a=>a.id===d.preparedId&&a.status==='success'))return c;
 const prior=c.actions.find(a=>a.benefit===b&&a.kind==='grant_prepare');
 const action:Action={id:prior?.id??crypto.randomUUID(),benefit:b,kind:'grant_prepare',amount:0,status:'success',revision:d.revision,consent:true,externalConsent:false,authenticated:false,label:`${GRANT_TITLES[b]} 신청 준비`,provider:'앱 내 준비 · 국세청 직접 신청',created:new Date().toISOString(),result:'신청 준비 완료 · 공식 접수 전',reportSnapshot:grantReport(c,b,d)};
 return {...c,actions:[action,...c.actions.filter(a=>a.id!==action.id)],grants:{...c.grants,[b]:{...d,preparedId:action.id,step:5}}};
}
export function revokeGrant(c:Customer,b:GrantKind):Customer{return {...c,grants:{...c.grants,[b]:newGrantDraft()},actions:c.actions.filter(a=>!(a.benefit===b&&['grant_prepare','grant_submit'].includes(a.kind)))}}

export function submitGrant(c:Customer,b:GrantKind,mode:Mode):Customer{
 const d=getGrant(c,b),evaluation=evaluateGrant(d,b);
 const prior=c.actions.find(a=>a.benefit===b&&a.kind==='grant_submit'&&['success','unknown','running'].includes(a.status));
 if(prior)return c;
 if(!evaluation.canPrepare)throw new Error(evaluation.reason+' '+grantWindow(d.date).note);
 if(!d.submitConsent||!d.authenticated)throw new Error('신청 내용에 대한 별도 동의와 인증이 필요해요.');
 const id=crypto.randomUUID();
 const status=mode==='delay'?'unknown':mode==='fail'?'failed':'success';
 const receipt=[`WON ${GRANT_TITLES[b]} 모의 접수 내역`,`실제 국세청 전송·접수 없음`,`모의 접수 번호: SIM-${id.slice(0,8).toUpperCase()}`,`고객: ${c.name}`,`소득 귀속연도: 2025`,`신청 유형: ${grantWindow(d.date).label}`,`수령계좌: ${bankGrantData(c).account}`,`지급액: 심사 후 결정`].join('\n');
 const action:Action={id,benefit:b,kind:'grant_submit',amount:0,status,revision:d.revision,approvedRevision:d.revision,consent:true,externalConsent:true,authenticated:true,label:`${GRANT_TITLES[b]} 신청`,provider:'국세청 연계 시뮬레이터',created:new Date().toISOString(),reportSnapshot:receipt,result:status==='success'?'모의 신청 접수 완료 · 심사 대기':status==='unknown'?'접수 응답 확인 중 · 중복 신청 차단':'모의 신청 실패 · 접수되지 않음'};
 return {...c,actions:[action,...c.actions.filter(a=>!(a.benefit===b&&a.kind==='grant_prepare'))],grants:{...c.grants,[b]:{...d,submittedId:id}}};
}
export function resolveGrantSubmission(c:Customer,b:GrantKind):Customer{
 const d=getGrant(c,b),a=c.actions.find(a=>a.id===d.submittedId&&a.kind==='grant_submit');
 if(!a||a.status!=='unknown')return c;
 const valid=d.revision===a.approvedRevision&&d.consent&&d.submitConsent&&d.authenticated&&evaluateGrant(d,b).canPrepare;
 return {...c,actions:c.actions.map(row=>row.id===a.id?{...row,status:valid?'success':'failed',result:valid?'모의 신청 접수 완료 · 심사 대기':'정보 또는 동의 변경으로 미접수 · 재확인 필요'}:row)};
}
