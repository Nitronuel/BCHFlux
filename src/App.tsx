
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
  const { initialize: initializeUser, fetchOrders, fetchPositions, userId, accountMode, syncRealBalance } = useUserStore();
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
    fetchPositions();
    const interval = setInterval(() => {
      fetchOrders();
      fetchPositions();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, fetchOrders, fetchPositions]);

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
    <>
      {/* FULL-SCREEN COMING SOON OVERLAY */}
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0d1117] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 pointer-events-none" />

        {/* Glow effect backdrops */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-green-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center px-4 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent mb-2">
            BCHFlux
          </h1>

          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-2xl md:text-4xl font-semibold text-gray-200">
              Stay Tuned
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-lg mx-auto">
              App features are coming soon. We are working hard to bring you the best experience possible.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-[bounce_1s_infinite_400ms]" />
          </div>
        </div>
      </div>

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
    </>
  );
}

export default App;
