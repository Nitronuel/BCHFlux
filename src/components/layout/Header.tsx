import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Globe, User, ChevronDown } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useWalletStore } from '../../store/walletStore';
import ConnectWalletModal from '../wallet/ConnectWalletModal';

const Header: React.FC = () => {
    const location = useLocation();
    const { accountMode, setAccountMode } = useUserStore();
    const { isConnected, address, balance, disconnect, setAccountMode: setWalletMode } = useWalletStore();
    const [isConnectOpen, setIsConnectOpen] = useState(false);
    const [isLoggedIn] = useState(true);

    const isActive = (path: string) => location.pathname.startsWith(path);

    const navItems = [
        { name: 'Markets', path: '/markets', hasDropdown: false },
        { name: 'Trade', path: '/trade', hasDropdown: true },
        { name: 'Leverage', path: '/leverage', hasDropdown: true },
        { name: 'Wallet', path: '/wallet', hasDropdown: true },
        { name: 'Payroll', path: '/payroll', hasDropdown: false },
    ];

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        const clean = addr.replace('bitcoincash:', '');
        return `${clean.substring(0, 6)}...${clean.substring(clean.length - 4)}`;
    };

    const handleModeSwitch = (mode: 'demo' | 'real') => {
        if (mode === 'real' && !isConnected) {
            // Can't switch to real without a connected wallet
            setIsConnectOpen(true);
            return;
        }
        setAccountMode(mode);
        setWalletMode(mode);
    };

    const handleDisconnect = () => {
        disconnect();
        setAccountMode('demo');
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
                {/* Left: Logo & Nav */}
                <div className="flex items-center gap-8 h-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 text-primary hover:text-white transition-colors">
                        <span className="text-xl font-bold tracking-tight text-white">BCHFlux</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex h-full">
                        {navItems.map((item) => (
                            <div key={item.name} className="relative group h-full flex items-center">
                                <Link
                                    to={item.path === '/trade' ? '/trade/spot/BCHUSDT' : item.path === '/leverage' ? '/leverage/BCHUSDT' : item.path}
                                    className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${isActive(item.path) ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    {item.name}
                                    {item.hasDropdown && <ChevronDown className="w-3 h-3 pt-0.5" />}
                                </Link>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 text-text-secondary">
                    {/* Mode Toggle Pill */}
                    <div className="hidden md:flex items-center bg-background border border-border rounded-full p-0.5">
                        <button
                            onClick={() => handleModeSwitch('demo')}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${accountMode === 'demo'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            Demo
                        </button>
                        <button
                            onClick={() => handleModeSwitch('real')}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${accountMode === 'real'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-text-secondary hover:text-text-primary'
                                }`}
                            title={!isConnected ? 'Connect wallet to go live' : 'Switch to real wallet'}
                        >
                            Live
                        </button>
                    </div>

                    {/* Connect Wallet Button */}
                    {isConnected && address ? (
                        <div className="hidden md:flex items-center gap-2 bg-background border border-border rounded-full px-3 py-1.5">
                            <span className="text-xs font-medium text-text-primary">
                                {balance.bch.toFixed(4)} BCH
                            </span>
                            <div className="h-4 w-[1px] bg-border"></div>
                            <button
                                onClick={handleDisconnect}
                                className="text-xs font-mono text-text-secondary hover:text-red-400 transition-colors"
                                title="Disconnect"
                            >
                                {formatAddress(address)}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsConnectOpen(true)}
                            className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 rounded-full transition-all text-sm font-medium"
                        >
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Connect Wallet
                        </button>
                    )}

                    {/* Search */}
                    <div className="hidden lg:flex items-center gap-2 px-2 py-1 bg-background rounded-full border border-border focus-within:border-primary transition-colors">
                        <Search className="w-4 h-4 ml-2" />
                        <input
                            type="text"
                            placeholder="Search coin"
                            className="bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-disabled w-32 focus:w-48 transition-all"
                        />
                    </div>

                    <button className="hover:text-primary transition-colors">
                        <Globe className="w-5 h-5" />
                    </button>

                    {isLoggedIn ? (
                        <>
                            <Link to="/notifications" className="hover:text-primary transition-colors relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-sell rounded-full border border-surface"></span>
                            </Link>
                            <Link to="/profile" className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-primary hover:bg-text-disabled cursor-pointer">
                                <User className="w-4 h-4" />
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" className="px-4 py-1.5 text-sm hover:text-primary transition-colors">Log In</Link>
                            <Link to="/register" className="px-4 py-1.5 text-sm bg-primary text-background font-medium rounded hover:bg-opacity-90 transition-colors">Register</Link>
                        </div>
                    )}
                </div>
            </header>

            <ConnectWalletModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
        </>
    );
};

export default Header;
