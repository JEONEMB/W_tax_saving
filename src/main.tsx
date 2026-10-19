import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
import './bank-theme.css';
import './scenario-panel.css';
import './journey.css';
import './results.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
