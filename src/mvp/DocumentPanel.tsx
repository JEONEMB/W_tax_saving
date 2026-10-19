import {useEffect,useRef,useState} from 'react';
import type {Worker} from 'tesseract.js';
import workerPath from 'tesseract.js/dist/worker.min.js?url';
import {contractDraft} from './documents';
import {validateInput,rules,type Input,type Contract,type Field} from './engine';

export default function DocumentPanel({input,onChange}:{input:Input;onChange:(input:Input)=>void}){
 const [text,setText]=useState(''),[draft,setDraft]=useState<Contract|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState(''),[origin,setOrigin]=useState<'ocr'|'manual'>('manual');
 const [summary,setSummary]=useState<Partial<Input['profile']>|null>(null);
 const worker=useRef<Worker|null>(null),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;void worker.current?.terminate()},[]);
 async function recognize(file:File){
  if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('8MB 이하 PNG·JPEG·WebP 이미지를 선택하세요.');return}
  const run=++generation.current;setBusy(true);setError('');setText('');setDraft(null);setProgress(0);
  let timer:ReturnType<typeof setTimeout>|undefined;
  let created:Worker|null=null;
  try{
   timer=setTimeout(()=>{generation.current++;void created?.terminate();setBusy(false);setError('인식 시간이 길어 중단했습니다. 텍스트를 직접 붙여넣어 확인할 수 있어요.')},60000);
   const {createWorker}=await import('tesseract.js');
   created=await createWorker('kor+eng',1,{workerPath,errorHandler:()=>{if(run===generation.current){generation.current++;setBusy(false);setError('인식 자료를 불러오지 못했습니다. 텍스트 초안을 직접 입력할 수 있어요.')}},logger:message=>{if(run===generation.current)setProgress(Math.round(message.progress*100))}});
   if(run!==generation.current){await created.terminate();return}
   worker.current=created;
   const result=await created.recognize(file);
   if(run===generation.current){setText(result.data.text.slice(0,12000));setOrigin('ocr');setDraft({...contractDraft(result.data.text),inputOrigin:'ocr'})}
  }catch{if(run===generation.current)setError('이미지를 인식하지 못했습니다. 언어 자료 다운로드 연결을 확인하거나 텍스트 초안을 직접 입력하세요.')}
  finally{if(timer)clearTimeout(timer);await created?.terminate();if(worker.current===created)worker.current=null;if(run===generation.current)setBusy(false)}
 }
 return <section className="white-card"><h2>계약서 초안 확인</h2><p>가상 계약서 이미지에서 월세·기간 초안을 추출합니다. 이체 증빙과 다르므로 납부 완료나 주소 일치를 자동으로 인정하지 않아요.</p><p className="fine-print">이미지는 브라우저에서 처리하고 저장·전송하지 않습니다. 첫 인식에는 OCR 프로그램·한국어 자료 다운로드가 필요합니다. 주민번호·계좌번호가 있는 실제 문서는 사용하지 마세요.</p><label className="field-label">가상 계약서 이미지<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void recognize(file)}}/></label>
  {busy&&<div role="status">문자 인식 중 {progress}% <button className="text-button" onClick={()=>{generation.current++;void worker.current?.terminate();worker.current=null;setBusy(false)}}>인식 취소</button></div>}
  {error&&<p role="alert">{error}</p>}
  <label className="field-label">인식된 텍스트 또는 직접 붙여넣은 초안<textarea rows={6} value={text} maxLength={12000} onChange={e=>{setText(e.target.value);setOrigin('manual');setDraft(null)}} placeholder={'월세: 600,000원\n계약기간: 2026-01-01 ~ 2026-12-31'}/></label><button className="secondary" disabled={busy||!text.trim()} onClick={()=>setDraft({...contractDraft(text),inputOrigin:origin})}>텍스트에서 확인할 값 추출</button>
  {draft&&<div className="mvp-document-draft"><h3>원문과 비교해 수정하세요</h3><label className="field-label">추출 월세 (원)<input type="number" min="0" value={draft.monthlyRent??''} onChange={e=>setDraft({...draft,monthlyRent:e.target.value===''?null:Number(e.target.value)})}/></label><label className="field-label">추출 계약 시작일<input type="date" value={draft.startDate||''} onChange={e=>setDraft({...draft,startDate:e.target.value||null})}/></label><label className="field-label">추출 계약 종료일<input type="date" value={draft.endDate||''} onChange={e=>setDraft({...draft,endDate:e.target.value||null})}/></label><button className="primary" disabled={!input.consent||busy} onClick={()=>{try{const next={...input,contract:draft};validateInput(next);onChange(next);setDraft(null);setText('');setError('')}catch(e){setError((e as Error).message)}}}>원문과 확인한 값만 진단에 반영</button><button className="secondary" onClick={()=>{setDraft(null);setText('')}}>초안 폐기</button></div>}
  {input.contract&&<div className="notice">고객 확인 자료: 월세 {input.contract.monthlyRent?.toLocaleString('ko-KR')??'미확인'}원 · {input.contract.startDate??'시작일 미확인'} ~ {input.contract.endDate??'종료일 미확인'}<br/>출처: {input.contract.inputOrigin==='ocr'?'OCR 초안 후 고객 확인':'직접 입력 후 고객 확인'}<button className="text-button" onClick={()=>onChange({...input,contract:null})}>확인 자료 삭제</button></div>}
  <hr/><h2>간소화 자료 요약 가져오기</h2><p>가상 간소화 자료를 아래 JSON 형식으로 정리해 가져옵니다. 국세청 원본 PDF·암호화 파일의 자동 해석은 지원하지 않습니다.</p><code>{'{"grossSalary":40000000,"pensionPaid":3000000,"irpPaid":0,"housingPaid":2400000}'}</code><label className="field-label">간소화 요약 JSON<input type="file" accept=".json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>50000)throw Error('50KB 이하 JSON을 사용하세요.');const value=JSON.parse(await file.text());if(!value||Array.isArray(value)||typeof value!=='object'||!Object.keys(value).length||Object.keys(value).some(k=>!['grossSalary','pensionPaid','irpPaid','housingPaid'].includes(k)))throw Error('안내된 요약 필드만 넣어 주세요.');validateInput({...input,profile:{...input.profile,...value}});setSummary(value);setError('')}catch(e){setSummary(null);setError((e as Error).message)}}}/></label>{summary&&<><h3>반영 전 요약 확인</h3>{Object.entries(summary).map(([key,value])=><p key={key}>{rules.fields[key as Field].label}: {value===null?'미확인':Number(value).toLocaleString('ko-KR')}</p>)}<button className="primary" disabled={!input.consent} onClick={()=>{onChange({...input,profile:{...input.profile,...summary}});setSummary(null)}}>확인한 요약을 프로필에 반영</button><button className="secondary" onClick={()=>setSummary(null)}>요약 가져오기 취소</button></>}
 </section>;
}
