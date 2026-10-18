import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ShieldCheck,Sparkles} from 'lucide-react';
import {type Customer} from './domain';
import {recommendations} from './recommendations';
import './discovery.css';

export function DiscoveryLoading({customer,onComplete}:{customer:Customer;onComplete:()=>void}){
 const [step,setStep]=useState(0);
 const complete=useRef(onComplete);complete.current=onComplete;
 useEffect(()=>{
  const timers=[setTimeout(()=>setStep(1),1000),setTimeout(()=>setStep(2),2100),setTimeout(()=>complete.current(),3300)];
  return()=>timers.forEach(clearTimeout);
 },[]);
 return <section className="discovery-loading" aria-busy="true">
  <span className="discovery-kicker">AIBEE · 나만의 절세 길잡이</span>
  <div className="bee-stage"><span className="bee-orbit"/><span className="bee-spark spark-one">✦</span><span className="bee-spark spark-two">✧</span><img className="flying-bee" src="/aibee.svg" alt="날아다니는 AIBEE 캐릭터"/><span className="bee-shadow"/></div>
  <h1>{customer.name}님께 맞는<br/>절세 방법을 찾고 있어요</h1>
  <p>놓치고 있던 기회부터 다음 행동까지<br/>AIBEE가 차근차근 정리할게요.</p>
  <div className="discovery-progress" role="status" aria-live="polite">{['고객 시나리오 살펴보기','절세·지원 항목 비교하기','맞춤 확인 목록 정리하기'].map((label,i)=><div key={label} className={i<=step?'current':''}><span>{i<step?<Check size={13}/>:i+1}</span>{label}</div>)}</div>
  <small>가상 고객 정보로 진행하는 분석 체험이에요.</small>
 </section>;
}

export function DiscoveryResults({customer:c,onNavigate:go}:{customer:Customer;onNavigate:(route:string)=>void}){
 const items=recommendations(c);
 return <section className="discovery-results">
  <div className="discovery-result-heading"><div className="discovery-result-avatar"><img src="/aibee.svg" alt="AIBEE"/></div><span className="discovery-kicker">AIBEE의 맞춤 확인 목록</span><h1>{c.name}님,<br/>이런 기회를 찾았어요</h1><p>지금 상황에 맞춰 먼저 살펴볼<br/>절세·지원 방법 {items.length}가지를 골랐어요.</p></div>
  <div className="discovery-context"><Sparkles size={17}/><span>{c.subtitle}</span></div>
  <p className="discovery-disclaimer">시연 고객의 샘플 정보 기준이에요. 실제 가입·공제·지원 대상 여부는 항목별 동의와 추가 확인 후 판단해요.</p>
  <div className="recommendation-list">{items.map((item,i)=><article key={item.benefit} className={`recommendation-card ${i===0?'featured':''}`}>
   <div className="recommendation-top"><span>{i===0?'먼저 살펴보세요':`함께 확인 ${i+1}`}</span><small>{item.status}</small></div>
   <h2>{item.title}</h2><p>{item.reason}</p>
   <div className="recommendation-next"><Check size={15}/><span>{item.action}</span></div>
   <button className={i===0?'primary':'secondary'} onClick={()=>go(`benefit/${item.benefit}`)} aria-label={`${item.title} 자세히 확인하기`}>자세히 확인하기 <ArrowRight size={17}/></button>
  </article>)}</div>
  <div className="discovery-safety"><ShieldCheck size={18}/><p>선택만으로 계좌가 개설되거나 납입되지 않아요. 실행 내용 확인 후 별도로 동의를 받아요.</p></div>
  <button className="secondary" onClick={()=>go('benefits')}>전체 절세·지원 항목 보기</button><button className="text-button" onClick={()=>go('data')}>추천에 사용한 정보 확인·수정</button>
 </section>;
}
