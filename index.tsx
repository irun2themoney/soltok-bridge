// Polyfill Buffer for Solana libraries (must be first)
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import OrderStatusPage from './components/OrderStatusPage';
import { WalletContextProvider } from './src/contexts/WalletContext';
import { ToastProvider } from './components/Toast';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletContextProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/order/:orderId" element={<OrderStatusPage />} />
          </Routes>
        </ToastProvider>
      </WalletContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
