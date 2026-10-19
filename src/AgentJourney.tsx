import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ShieldCheck,Database,Link2,Sparkles} from 'lucide-react';
import {bankFacts,connectionSpec,connectFinancial} from './bank-context';
import {analyze,executionReadiness,questions,sources,titles,answerQuestion,type Customer,type Benefit} from './domain';

export function KnownInformation({customer,benefit}:{customer:Customer;benefit?:Benefit}){
 return <section className="known-information"><div className="section-heading"><h2><Database size={17}/>우리은행이 확인했어요</h2><span>추가 입력 없음</span></div><dl>{bankFacts(customer,benefit).map(f=><div key={f.label}><dt>{f.label}<small>{f.source}</small></dt><dd>{f.value}</dd></div>)}</dl></section>;
}
export function AgentQuestions({customer:c,benefit:b,onChange}:{customer:Customer;benefit:Benefit;onChange:(c:Customer)=>void}){
 const required=executionReadiness(c,b).requiredKeys;
 const list=questions[b].filter(q=>required.includes(q.key)&&q.key!=='eligible'&&(!c.answers[q.key]||c.answers[q.key]==='unknown'||c.answers[q.key]==='no'));
 return list.length?<section className="agent-extra"><h3>이 정보만 더 알려주세요</h3><p>조회로 확인되지 않은 내용이에요.</p><div className="question-list">{list.slice(0,3).map(q=><fieldset key={q.key}><legend>{q.label}</legend><div className="choices">{q.options.map(([value,label])=><button key={value} className={c.answers[q.key]===value?'chosen':''} onClick={()=>onChange(answerQuestion(c,q.key,value))}>{label}</button>)}</div></fieldset>)}</div></section>:null;
}
export default function AgentJourney({customer:c,benefit:b,onChange,onStart,onNavigate}:{customer:Customer;benefit:Benefit;onChange:(c:Customer)=>void;onStart:(b:Benefit)=>void;onNavigate:(r:string)=>void}){
 const [consent,setConsent]=useState(false),[connecting,setConnecting]=useState(false);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const readiness=executionReadiness(c,b),diagnosis=analyze(c,b),spec=connectionSpec(b),connected=c.answers[`connection:${b}`]==='yes';
 const needsConnection=spec.keys.some(k=>readiness.requiredKeys.includes(k)&&(!c.answers[k]||c.answers[k]==='unknown'))&&b!=='sme';
 const account=c.accounts.find(a=>a.kind===b);
 const verb=b==='rent'?'월세 서류를 준비할게요':b==='sme'?'회사에 확인할 내용을 정리했어요':b==='card'?'카드 사용에서 공제를 찾아볼게요':account?'보유 계좌를 활용할게요':'새 계좌 개설을 도와드릴게요';
 async function connect(){if(!consent||connecting)return;setConnecting(true);await new Promise(r=>setTimeout(r,700));if(!alive.current)return;onChange(connectFinancial(c,b));setConnecting(false)}
 if(b==='isa'&&account){
  const opened=c.actions.find(a=>a.benefit==='isa'&&a.kind==='open'&&a.status==='success'&&(a.receipt?.accountId===account.id||account.id===`SIM-${a.id.slice(0,8)}`));
  return <div className="agent-journey isa-owned"><div className="page-heading"><span className="eyebrow">ISA · 보유 계좌</span><h1>이미 준비된 ISA가 있어요</h1><p>{c.name}님의 계좌와 개설 내역을 확인해 보세요.</p></div><KnownInformation customer={c} benefit={b}/><section className="agent-plan"><Check size={20}/><div><h2>{account.name}를 보유하고 있어요</h2><p>추가 개설 대신 기존 계좌의 결과를 확인할 수 있어요. 이 체험에서는 ISA 납입·투자 주문을 진행하지 않아요.</p></div></section><button className="primary" onClick={()=>onNavigate(opened?`action/${opened.id}`:'data')}>{opened?'개설 결과 보기':'보유 계좌정보 확인'}<ArrowRight size={18}/></button><button className="secondary" onClick={()=>onNavigate('recommendations')}>다른 절세 혜택 보기</button><p className="fine-print">처음부터 시연하려면 시연 컨트롤에서 ‘이 고객 시나리오 다시 시작’을 선택해 주세요.</p></div>;
 }
 return <div className="agent-journey"><div className="page-heading"><span className="eyebrow">AIBEE · 맞춤 실행 계획</span><h1>{titles[b]}</h1><p>{verb}</p></div>
 <KnownInformation customer={c} benefit={b}/>
 <section className="agent-plan"><Sparkles size={20}/><div><h2>{readiness.opening?`${titles[b]} 개설을 준비했어요`:b==='pension'?`가용 예산 ${Math.min(c.budget,2000000).toLocaleString('ko-KR')}원으로 납입을 검토해요`:verb}</h2><p>{b==='pension'?'보유 계좌와 납입 내역을 반영했어요. 추가 납입은 고객님이 정한 예산 안에서만 진행해요.':b==='isa'?'은행 신탁형과 증권사 중개형 중 투자 목적에 맞는 경로를 안내해요.':b==='rent'?'은행의 이체 기록에 계약·주소 자료를 더하면 증빙을 정리할 수 있어요.':'확인된 정보로 실행안을 만들고 마지막에 실행 동의를 받아요.'}</p></div></section>
 {needsConnection&&!connected&&<section className="connection-card"><span className="connection-icon"><Link2 size={22}/></span><h2>{spec.title}</h2><p>{spec.purpose}</p><dl><dt>조회 항목</dt><dd>{spec.fields}</dd><dt>이용 범위</dt><dd>이번 {titles[b]} 추천·실행 조건 확인</dd></dl><label className="check-label"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>위 추가 정보의 조회·이용에 동의합니다.</span></label><button className="primary" disabled={!consent||connecting} onClick={connect}>{connecting?'Agent가 정보를 확인하고 있어요…':'동의하고 Agent에게 조회 맡기기'}<ArrowRight size={17}/></button><small>연결 기관의 응답은 가상 데이터로 시연됩니다.</small></section>}
 {connected&&<div className="agent-connected"><Check size={17}/><span>동의한 추가 자료를 반영했어요.</span><button onClick={()=>{const next=answerQuestion(c,`connection:${b}`,'');onChange({...next,answers:Object.fromEntries(Object.entries(next.answers).filter(([key])=>!spec.keys.includes(key)))});setConsent(false)}}>동의 철회</button></div>}
 {(!needsConnection||connected)&&<AgentQuestions customer={c} benefit={b} onChange={onChange}/>}
 {diagnosis.value!==null&&<div className="agent-estimate"><small>{diagnosis.amountType} · {c.year}년</small><strong>{diagnosis.value.toLocaleString('ko-KR')}원</strong><p>현재 납입·사용 내역 기준이며 확정 환급액은 아니에요.</p></div>}
 {b==='isa'&&<p className="fine-print">비과세는 적격 순이익 기준입니다. 계좌 개설만으로 절세액이 발생하지 않으며 주식 이전·매수는 수행하지 않아요.</p>}
 {!['card','sme'].includes(b)&&<><div className="agent-next" role="status">{readiness.ready?<><Check size={17}/>실행안을 준비했어요. 내용과 동의만 확인해 주세요.</>:<><ShieldCheck size={17}/>{needsConnection&&!connected?'위 정보 조회에 동의하면 필요한 조건을 확인할게요.':readiness.reason}</>}</div><button className="primary" disabled={!readiness.ready} onClick={()=>onStart(b)}>{readiness.opening?'개설 내용 확인하기':b==='rent'?'증빙 준비 맡기기':'납입 내용 확인하기'}<ArrowRight size={18}/></button></>}
 {['card','sme'].includes(b)&&<section className="agent-plan"><ShieldCheck size={20}/><div><h2>{b==='sme'?'회사 담당자에게 확인해 주세요':'연말정산에서 반영할 항목이에요'}</h2><p>{b==='sme'?'회사 업종, 최초 감면 취업일, 이미 감면을 적용 중인지 확인하면 신청에 필요한 내용을 정리할 수 있어요.':'카드 사용액 공제는 별도 상품 개설 없이 연말정산에 반영해요. 추가 소비를 하기보다 기존 사용 내역을 확인해 주세요.'}</p><a className="text-button" href={sources[b].url} target="_blank" rel="noreferrer">공식 안내 확인 ↗</a></div></section>}
 <details className="journey-source"><summary>사용한 정보와 판단 근거</summary><p>{sources[b].note}</p><a href={sources[b].url} target="_blank" rel="noreferrer">{sources[b].label} ↗</a><p>문서 기준 2026-10-17 · 가상 고객의 표준 조건</p><button className="text-button" onClick={()=>onNavigate('data')}>내 정보 확인</button></details></div>;
}
