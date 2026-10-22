import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import CaptureRemote from './CaptureRemote';
import './style.css';
import './bank-theme.css';
import './scenario-panel.css';
import './journey.css';
import './results.css';
function Root(){
 const [route,setRoute]=React.useState(location.hash.slice(1));
 React.useEffect(()=>{const changed=()=>setRoute(location.hash.slice(1));addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed)},[]);
 return route.startsWith('capture/')?<CaptureRemote route={route}/>:<><App/><a className="capture-launch" href="#capture/a">리모콘 V2 · 캡처</a></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Root/></React.StrictMode>);
