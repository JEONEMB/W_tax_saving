import GrantResult from './GrantResult';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,CheckCircle2,Link2,ShieldCheck,LoaderCircle} from 'lucide-react';
import type {Customer,Mode} from './domain';
import {bankFacts,connectGrant} from './bank-context';
import {getGrant,evaluateGrant,grantQuestionGroups,grantWindow,bankGrantData,updateGrant,revokeGrant,submitGrant,resolveGrantSubmission,GRANT_TITLES,GRANT_SOURCES,type GrantKind} from './grants';

export default function GrantAgentFlow({customer:c,benefit:b,onChange,onNavigate,mode='normal'}:{customer:Customer;benefit:GrantKind;onChange:(c:Customer)=>void;onNavigate:(route:string)=>void;mode?:Mode}){
 const d=getGrant(c,b),evaluation=evaluateGrant(d,b),period=grantWindow(d.date),bank=bankGrantData(c);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const receipt=c.actions.find(a=>a.benefit===b&&a.kind==='grant_submit'&&a.id===d.submittedId);
 const patch=(change:Parameters<typeof updateGrant>[2])=>{setError('');onChange(updateGrant(c,b,change))};
 async function connect(){if(!consent||busy)return;setBusy('동의한 가구·소득·재산 자료를 확인하고 있어요');await new Promise(r=>setTimeout(r,800));if(!alive.current)return;onChange(connectGrant(c,b));setBusy('')}
 async function submit(){if(busy)return;setBusy('신청서를 작성하고 모의 접수 응답을 확인하고 있어요');await new Promise(r=>setTimeout(r,900));if(!alive.current)return;try{onChange(submitGrant(c,b,mode))}catch(e){setError((e as Error).message)}setBusy('')}
 function download(){if(!receipt)return;const url=URL.createObjectURL(new Blob([receipt.reportSnapshot||''],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`WON-${b}-모의접수.txt`;a.click();URL.revokeObjectURL(url)}
 const qs=grantQuestionGroups(b).flat();
 const canSubmit=evaluation.canPrepare&&d.submitConsent&&d.authenticated;
 return <div className="agent-journey grant-agent"><div className="page-heading"><span className="eyebrow">AIBEE · 정부지원 신청</span><h1>{GRANT_TITLES[b]}</h1><p>은행 정보로 신청서를 채우고,<br/>동의한 추가 자료를 확인해 접수까지 도와드려요.</p></div>
 <div className="grant-window"><span>{period.label}</span><small>2025년 소득분 · 지급액은 심사 후 결정</small></div>
 {error&&<div className="notice error" role="alert">{error}</div>}
 {receipt&&['success','unknown','failed'].includes(receipt.status)?<>
  <GrantResult customer={c} benefit={b} receipt={receipt} onDownload={download} onResolve={()=>onChange(resolveGrantSubmission(c,b))} onRetry={()=>patch({submittedId:undefined,submitConsent:false,authenticated:false})} onNavigate={onNavigate}/></>:
 <><section className="known-information"><div className="section-heading"><h2>신청서에 미리 채웠어요</h2><span>은행 보유 정보</span></div><dl>{[...bankFacts(c).filter(f=>f.label!=='입출금 잔액'),{label:'수령계좌',value:bank.account,source:'본인 명의 계좌'},{label:'연락처',value:bank.contact,source:'은행 등록 정보'}].map(f=><div key={f.label}><dt>{f.label}<small>{f.source}</small></dt><dd>{f.value}</dd></div>)}</dl><p className="fine-print">가구 전체 소득·재산은 은행 입금액이나 잔액으로 추정하지 않아요.</p></section>
 {!d.consent?<section className="connection-card"><span className="connection-icon"><Link2 size={22}/></span><h2>신청에 필요한 자료만 더 확인할게요</h2><p>다시 입력하지 않도록 Agent가 연계 자료를 확인합니다.</p><dl><dt>조회 항목</dt><dd>가구 구성·총소득·가구 재산·기신청 내역{b==='grant_child'?'·부양자녀':''}</dd><dt>이용 목적</dt><dd>{GRANT_TITLES[b]} 조건 확인과 신청서 작성</dd></dl><label className="check-label"><input type="checkbox" disabled={!!busy} checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>위 추가 정보 조회·이용에 동의합니다.</span></label><button className="primary" disabled={!consent||!!busy} onClick={connect}>{busy?'필요한 자료를 확인하고 있어요…':'동의하고 Agent에게 조회 맡기기'}<ArrowRight size={17}/></button><small>공공·금융기관 연계는 가상 응답으로 시연합니다.</small></section>:<>
 <div className="agent-connected"><Check size={17}/>동의한 소득·재산 자료로 신청 내용을 채웠어요.</div>
 <section className="agent-plan"><ShieldCheck size={21}/><div><h2>{evaluation.canPrepare?'신청 조건을 확인했어요':'추가 확인이 필요해요'}</h2><p>{evaluation.reason}</p>{!period.open&&<p>{period.note}</p>}{evaluation.warning&&<p>{evaluation.warning}</p>}</div></section>
 {evaluation.missing.length>0&&<section className="agent-extra"><h3>조회로 확인되지 않은 정보만 알려주세요</h3>{evaluation.missing.slice(0,3).map(q=><label className="field-label" key={q.key}>{q.label}{q.numeric?<input type="number" min="0" value={d.answers[q.key]||''} onChange={e=>patch({answers:{...d.answers,[q.key]:e.target.value}})}/>:<select value={d.answers[q.key]||'unknown'} onChange={e=>patch({answers:{...d.answers,[q.key]:e.target.value}})}>{q.options?.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}</label>)}</section>}
 <details className="journey-source"><summary>Agent가 확인한 신청 내용</summary><dl>{qs.map(q=><div key={q.key}><dt>{q.label}</dt><dd>{q.numeric?Number(d.answers[q.key]||0).toLocaleString('ko-KR')+'원':q.options?.find(([v])=>v===d.answers[q.key])?.[1]||'미확인'}</dd></div>)}</dl><p>가상 연계 자료 · 소득 2025년 / 재산 2025-06-01</p></details>
 <section className="execution-consent"><h2>확인한 내용으로 신청할까요?</h2><p>조회 동의와 별도로, 신청서 작성·제출에 대한 동의를 받아요.</p><label className="check-label"><input type="checkbox" disabled={!!busy||!evaluation.canPrepare} checked={!!d.submitConsent} onChange={e=>patch({submitConsent:e.target.checked,authenticated:false})}/><span>수령계좌와 신청 내용을 확인했으며, Agent의 {GRANT_TITLES[b]} 모의 신청에 동의합니다.</span></label><button className={`auth-button ${d.authenticated?'verified':''}`} disabled={!d.submitConsent||!!busy} onClick={()=>patch({authenticated:!d.authenticated})}><ShieldCheck size={19}/>{d.authenticated?'인증 확인 완료':'간편인증 확인 · 모의'}</button><button className="primary" disabled={!canSubmit||!!busy} onClick={submit}>Agent에게 신청 맡기기<ArrowRight size={17}/></button></section>
 </>}
 </>}
 {busy&&<div className="agent-working" role="status"><LoaderCircle size={20}/>{busy}</div>}
 <details className="journey-source"><summary>신청 기준·공식 안내</summary><a href={GRANT_SOURCES.eligibility} target="_blank" rel="noreferrer">국세청 신청 요건 ↗</a><a href={GRANT_SOURCES.application} target="_blank" rel="noreferrer">신청기간·방법 ↗</a><p>정부지원금은 세금 환급액과 별도입니다.</p></details>
 {d.consent&&<button className="text-button muted" disabled={!!busy} onClick={()=>{if(confirm('이 장려금의 추가 정보와 모의 신청 내역을 삭제할까요?')){onChange(revokeGrant(c,b));setConsent(false)}}}>추가 정보 동의 철회</button>}
 </div>;
}
