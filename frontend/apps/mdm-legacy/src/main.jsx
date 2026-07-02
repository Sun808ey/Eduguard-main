import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import '../assets/css/base.css';
import '../assets/css/components.css';
import '../assets/css/layout.css';
import '../assets/css/animations.css';
import '../assets/css/landing.css';
import '../assets/css/dashboard.css';
import '../assets/css/login.css';
import './styles/enrollment.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
