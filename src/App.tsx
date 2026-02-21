
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/layout/ScrollToTop';
import MarketsPage from './pages/MarketsPage';
import SpotTradePage from './pages/SpotTradePage';
import FuturesTradePage from './pages/FuturesTradePage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PayrollPage from './pages/PayrollPage';
import BridgePage from './pages/BridgePage';
import Toast from './components/common/Toast';

import { useMarketStore } from './store/marketStore';
import { useUserStore } from './store/userStore';
import { useWalletStore } from './store/walletStore';
import { WalletService } from './services/WalletService';

function App() {
  const initializeMarkets = useMarketStore((state) => state.initializeMarkets);
  const startLiveUpdates = useMarketStore((state) => state.startLiveUpdates);
  const { initialize: initializeUser, fetchOrders, userId, accountMode, syncRealBalance } = useUserStore();
  const { isConnected, setBalance: setWalletBalance } = useWalletStore();

  // Initialize markets and start WebSocket on mount
  useEffect(() => {
    initializeUser();
    initializeMarkets();
    const unsubscribe = startLiveUpdates();
    return () => unsubscribe();
  }, [initializeMarkets, startLiveUpdates, initializeUser]);

  // Poll for Order Updates
  useEffect(() => {
    if (!userId) return;
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, fetchOrders]);

  // Real balance polling — sync wallet balance every 30s when in Live mode
  useEffect(() => {
    if (accountMode !== 'real' || !isConnected) return;

    const syncBalance = async () => {
      try {
        const balance = await WalletService.getBalance();
        syncRealBalance(balance.bch, balance.usd);
        setWalletBalance(balance.bch, balance.usd);
      } catch (err) {
        console.warn('[App] Balance sync failed:', err);
      }
    };

    // Sync immediately
    syncBalance();
    // Then poll every 30s
    const interval = setInterval(syncBalance, 30000);
    return () => clearInterval(interval);
  }, [accountMode, isConnected, syncRealBalance, setWalletBalance]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/markets" replace />} />
          <Route path="/markets" element={<MarketsPage />} />
          <Route path="/trade/spot/:pair" element={<SpotTradePage />} />
          <Route path="/leverage/:pair" element={<FuturesTradePage />} />
          <Route path="/wallet/*" element={<WalletPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/bridge" element={<BridgePage />} />
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
