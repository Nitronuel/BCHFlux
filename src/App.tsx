
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import MarketsPage from './pages/MarketsPage';
import SpotTradePage from './pages/SpotTradePage';
import FuturesTradePage from './pages/FuturesTradePage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PayrollPage from './pages/PayrollPage';
import Toast from './components/common/Toast';

import { useMarketStore } from './store/marketStore';
import { useUserStore } from './store/userStore';

function App() {
  // Optimize subscription to prevent re-renders on price updates
  const initializeMarkets = useMarketStore((state) => state.initializeMarkets);
  const startLiveUpdates = useMarketStore((state) => state.startLiveUpdates);
  const { initialize: initializeUser, fetchOrders, userId } = useUserStore();

  // Initialize markets and start WebSocket on mount
  // Trigger HMR update
  useEffect(() => {
    // Step 1: Initialize User (Generate ID if needed)
    initializeUser();

    // Step 2: Load metadata (from cache or CoinGecko)
    initializeMarkets();

    // Step 3: Start WebSocket for live price updates
    const unsubscribe = startLiveUpdates();

    return () => unsubscribe();
  }, [initializeMarkets, startLiveUpdates, initializeUser]);

  // Poll for Order Updates (Sync with Backend)
  useEffect(() => {
    if (!userId) return;

    // Fetch immediately
    fetchOrders();

    // Poll every 5 seconds (matching backend loop)
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, fetchOrders]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/markets" replace />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/trade/spot/:pair" element={<SpotTradePage />} />
          <Route path="/leverage/:pair" element={<FuturesTradePage />} />
          <Route path="/wallet/*" element={<WalletPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/profile/*" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<div className="p-10 pt-20 text-2xl">404 Not Found</div>} />
        </Routes>
      </Layout>

      <Toast />
    </BrowserRouter>
  );
}

export default App;
