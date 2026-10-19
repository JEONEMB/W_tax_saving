import {validDate,type Contract} from './engine';
export function contractDraft(text:string):Contract{
 const match=text.match(/(?:월세|월차임|차임|monthly\s+rent|rent)\s*[:：]?\s*(?:금\s*)?([\d,]+)\s*(만원|원|KRW)?/i);
 const amount=match?Number(match[1].replaceAll(',',''))*(match[2]==='만원'?10000:1):null;
 const dates=[...text.matchAll(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`).filter(validDate);
 return {monthlyRent:amount!==null&&Number.isSafeInteger(amount)&&amount<=1e12?amount:null,startDate:dates[0]||null,endDate:dates[1]||null,confirmedByUser:true,inputOrigin:'manual'};
}
