export function sessionToken(){let value=localStorage.getItem('won-mvp-session');if(!value){value=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');localStorage.setItem('won-mvp-session',value)}return value}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(`/api/${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${sessionToken()}`},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(path==='chat'?15000:5000)});
 if(!response.ok){let detail='저장 서버에 연결할 수 없습니다.';try{const error=await response.json();detail=typeof error.detail==='string'?error.detail:'입력 형식을 확인하세요.'}catch{/* non-JSON proxy error */}throw Error(`${response.status}: ${detail}`)}
 return response.status===204?undefined as T:await response.json() as T;
}
