import {useEffect,useRef,useState,type ReactNode} from 'react';
import {toPng} from 'html-to-image';
import './capture.css';

export const captureGroups = [
 {id:'a',name:'유형 진단부터 납입까지',page:'제안서 2쪽',height:355,titles:['내 유형과 맞춤 추천','버튼 반영 재계산','납입 결과·남은 한도']},
 {id:'b',name:'결혼 준비에 맞춘 재계산',page:'제안서 3쪽',height:235,titles:['상황 버튼 선택','계획 재계산']},
 {id:'c',name:'저축 여력이 낮은 고객 지원',page:'제안서 5쪽',height:235,titles:['월세 계약과 이체 내역 확인','근로장려금 신청 전 확인']},
] as const;

const select=(id:string)=>{location.hash=`capture/${id}`};
function Chip({children,selected=false,onClick}:{children:ReactNode;selected?:boolean;onClick?:()=>void}){
 return <button className={`cap-chip ${selected?'selected':''}`} aria-pressed={selected} onClick={onClick}>{selected&&<span>✓ </span>}{children}</button>;
}
function Amount({label,value}:{label:string;value:string}){return <div className="cap-amount"><span>{label}</span><strong>{value}</strong></div>}
function Tax({amount,before}:{amount:string;before?:string}){return <div className="cap-tax"><div><span>국세 감소액</span><strong>{amount}</strong></div><small>{before&&`변경 전 ${before} · `}최종 환급액 아님</small></div>}
function Cta({children,target}:{children:ReactNode;target?:string}){return <button className="cap-cta" onClick={()=>target&&select(target)}>{children}<span>→</span></button>}

function Content({id}:{id:string}){
 switch(id){
 case 'a1': return <>
  <div className="cap-type"><span className="cap-kicker">입력 없이 찾은 나의 절세 유형</span><h2>월세 사는 사회초년생형</h2><div className="cap-tags"><span>총급여 약 4,000만 원</span><span>월세 이체 12건</span><span>연금저축 보유</span></div></div>
  <div className="cap-top-label">지금 챙길 맞춤 추천 <b>TOP 3</b></div>
  <div className="cap-recommend"><b>01</b><div><strong>연금저축 추가 납입</strong><p>200만 원 넣으면 국세 <em>300,000원</em> 감소</p><small>최종 환급액 아님 · 우리 연금저축(가상)</small></div></div>
  <div className="cap-recommend"><b>02</b><div><strong>청약 납입 유지</strong><p>내 집 마련 목표도 함께 챙겨요</p></div></div>
  <div className="cap-recommend"><b>03</b><div><strong>월세 세액공제 증빙 정리</strong><p>이체 내역 12건 확인</p></div></div>
  <div className="cap-situations"><small>내 상황을 누르면 계획에 반영해요</small><div className="cap-chips"><Chip onClick={()=>select('a2')}>청약 20만 원 유지</Chip><Chip onClick={()=>select('b1')}>결혼 준비</Chip><Chip>내 집 마련</Chip><Chip>목돈 생김</Chip></div></div>
 </>;
 case 'a2': return <>
  <div className="cap-chips"><Chip selected>청약 20만 원 유지</Chip></div>
  <h2 className="cap-lead">절세와 청약 목표를 함께</h2><p className="cap-muted">가용 자금 2,000,000원으로 제안해요</p>
  <div className="cap-card"><Amount label="연금저축" value="1,800,000원"/><Amount label="청약" value="200,000원"/></div>
  <Tax amount="282,000원"/>
  <p className="cap-compare">연금에만 넣으면 <b>300,000원</b> (청약 목표 미충족)<br/><small>최종 환급액 아님</small></p>
  <div className="cap-account"><span>출금 계좌</span><b>우리 WON통장 (가상)</b><small>1002-•••-0821 (가상)</small></div>
  <Cta target="a3">승인하고 인증하기</Cta>
 </>;
 case 'a3': return <>
  <div className="cap-complete"><span>✓</span><div><h2>계획대로 납입했어요</h2><p>모의 납입 완료 · 실제 금융거래 없음</p></div></div>
  <div className="cap-card"><p className="cap-section-label">납입 완료</p><Amount label="연금저축" value="1,800,000원"/><Amount label="청약" value="200,000원"/><small>우리 연금저축(가상) · 주택청약종합저축(가상)</small></div>
  <div className="cap-card cap-room"><p className="cap-section-label">남은 한도</p><Amount label="연금저축" value="1,200,000원"/><Amount label="청약" value="400,000원"/></div>
  <div className="cap-reminder"><b>다음 확인도 세금비서와 함께</b><p>연말정산 자료 반영 여부를<br/>1월에 확인해 드릴게요</p></div>
 </>;
 case 'b1': return <>
  <div className="cap-sheet"><div className="cap-handle"/><div className="cap-sheet-heading"><div><span className="cap-kicker">내 상황 반영하기</span><h2>결혼 준비, 필요한 돈부터 남겨요</h2></div><Chip selected>결혼 준비</Chip></div>
  <div className="cap-choice-row"><b>언제 준비하나요?</b><div className="cap-chips"><Chip>올해</Chip><Chip selected>내년 봄</Chip><Chip>내년 하반기</Chip></div></div>
  <div className="cap-choice-row"><b>얼마를 남겨둘까요?</b><div className="cap-chips"><Chip>50만 원</Chip><Chip selected>80만 원 남기기</Chip><Chip>직접 입력</Chip></div></div>
  <Cta target="b2">선택한 상황으로 계획 보기</Cta></div>
 </>;
 case 'b2': return <>
  <div className="cap-event">생애 이벤트: 결혼·전세 (2027년 봄)</div>
  <div className="cap-plan-grid"><div className="cap-card"><Amount label="연금저축" value="1,000,000원"/><Amount label="청약" value="200,000원"/><Amount label="남겨둘 현금" value="800,000원"/></div><Tax amount="162,000원" before="282,000원"/></div>
  <p className="cap-explanation">세금 감소액은 줄지만, 내년에 필요한 현금 80만 원을 확보할 수 있어요.</p>
  <Cta>변경된 계획으로 다시 승인</Cta>
 </>;
 case 'c1': return <>
  <div className="cap-identity"><span>✓ 본인확인 완료</span><small>가상 고객</small></div>
  <div className="cap-rent"><span className="cap-kicker">은행 이체 기록에서 찾은 월세 후보</span><h2>매월 600,000원 · 반복 이체 12건</h2><div className="cap-months">{Array.from({length:12},(_,i)=><span key={i}>{i+1}월<b>✓</b></span>)}</div></div>
  <p className="cap-explanation">은행 이체 기록에 계약·주소 자료를 더하면<br/>증빙을 정리할 수 있어요</p>
 </>;
 default: return <>
  <div className="cap-checks"><div><b>✓ 수령 계좌 확인</b><span>1002-•••-0821 (가상)</span></div><div><b>✓ 연락처 확인</b><span>010-••••-0821 (가상)</span></div></div>
  <div className="cap-reference"><b>급여 추정 입금</b><span>참고 정보</span><small>신청 자격·지급액은 공식 경로에서 확인해요</small></div>
  <p className="cap-explanation">가구 전체 소득·재산은 은행 입금액이나 잔액으로 추정하지 않아요</p>
  <Cta>손택스에서 신청하기</Cta><small className="cap-footnote">은행이 신청서를 대신 작성하지 않아요 · 캡처용 예시</small>
 </>;
 }
}

export default function CaptureRemote({route}:{route:string}){
 const requested=route.replace('capture/','');
 const group=captureGroups.find(g=>g.id===requested[0])||captureGroups[0];
 const number=Number(requested.slice(1));
 const single=Number.isInteger(number)&&number>=1&&number<=group.titles.length;
 const ids=group.titles.map((_,i)=>i).filter(i=>!single||i===number-1);
 const width=single?(1040-18*(group.titles.length-1))/group.titles.length:1040;
 const board=useRef<HTMLDivElement>(null),space=useRef<HTMLDivElement>(null);
 const [scale,setScale]=useState(1),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setMessage('');const el=space.current;if(!el)return;const observer=new ResizeObserver(()=>setScale(Math.min(1,el.clientWidth/width)));observer.observe(el);return()=>observer.disconnect()},[width,route]);
 async function save(){if(!board.current||saving)return;setSaving(true);setMessage('');try{await document.fonts.ready;const url=await toPng(board.current,{pixelRatio:2,backgroundColor:'#ffffff',skipFonts:true,width,height:group.height});const a=document.createElement('a');a.href=url;a.download=`WON-v3.3-${group.id}${single?number:'-all'}.png`;a.click();setMessage('PNG를 저장했습니다.')}catch{setMessage('PNG 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.')}finally{setSaving(false)}}
 return <div className="capture-workspace"><aside className="capture-remote"><a href="#home" className="capture-back">← 기존 체험으로</a><span className="capture-eyebrow">WON TAX ASSISTANT</span><h1>리모콘 <em>V2</em></h1><p>원하는 장면을 누르고<br/>제안서에 바로 저장하세요.</p>
 {captureGroups.map((g,i)=><section key={g.id}><h2><span>0{i+1}</span>{g.name}</h2><small>{g.page}</small><button disabled={saving} className={requested===g.id?'active':''} onClick={()=>select(g.id)}>전체 {g.titles.length}화면 · 제안서용</button>{g.titles.map((title,j)=><button disabled={saving} className={requested===`${g.id}${j+1}`?'active':''} key={title} onClick={()=>select(`${g.id}${j+1}`)}>{j+1}. {title}</button>)}</section>)}
 <div className="capture-remote-note">캡처 사양서 v3.3<br/>가상 데이터 · 고정된 예시 화면</div></aside>
 <main className="capture-main"><header><div><span className="capture-eyebrow">CAPTURE STUDIO / {group.page}</span><h2>{single?group.titles[number-1]:group.name}</h2><p>{single?'개별 패널':'전체 패널'} · PNG {Math.round(width*2)} × {group.height*2}px</p></div><button className="capture-save" onClick={save} disabled={saving}>{saving?'이미지 만드는 중…':'PNG 저장'} <span>↓</span></button></header>
 <div className="capture-stage" ref={space}><div className="capture-size" style={{width:width*scale,height:group.height*scale}}><div style={{transform:`scale(${scale})`,transformOrigin:'top left',width}}><div ref={board} data-testid="capture-board" className={`capture-board cap-${group.id} ${single?'cap-single':''}`} style={{width,height:group.height}}>
 {ids.map(i=><section className="cap-panel" key={`${group.id}${i}`}><header className="cap-panel-heading"><b>{i+1}</b><h3>{group.titles[i]}</h3><span>WON</span></header><div className="cap-panel-body"><Content id={`${group.id}${i+1}`}/></div><footer>WON 세금비서 · 가상 데이터</footer></section>)}
 </div></div></div></div>
 <div className="capture-status" role="status">{message||'왼쪽 버튼으로 바로 이동할 수 있어요. 저장 이미지에는 리모콘과 여백이 포함되지 않습니다.'}</div><div className="capture-help"><b>캡처 준비 완료</b><p>PNG 저장 후 Word에서 너비를 17.4cm로 맞추세요. 전체 패널은 사양서의 고정 비율이며, 화면을 확대하거나 스크롤하며 캡처할 필요가 없습니다.</p><small>목업 버튼은 화면 예시입니다. 실제 인증·납입·예약·정부 신청은 실행하지 않습니다.</small></div>
 </main></div>;
}
