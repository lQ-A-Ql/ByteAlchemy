import './styles/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';

// Silence non-error console output
console.log = () => {};
console.info = () => {};
console.warn = () => {};

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
