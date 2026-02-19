import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Globe, User, ChevronDown } from 'lucide-react';
import { useUserStore } from '../../store/userStore';

const Header: React.FC = () => {
    const location = useLocation();
    const { isDemoMode, toggleDemoMode } = useUserStore();
    const [isLoggedIn] = useState(true); // Mock login state

    const isActive = (path: string) => location.pathname.startsWith(path);

    const navItems = [
        { name: 'Markets', path: '/markets', hasDropdown: false },
        { name: 'Trade', path: '/trade', hasDropdown: true },
        { name: 'Leverage', path: '/leverage', hasDropdown: true },

        { name: 'Wallet', path: '/wallet', hasDropdown: true },
        { name: 'Payroll', path: '/payroll', hasDropdown: false },
    ];

    return (
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
                                to={item.path === '/trade' ? '/trade/spot/BTCUSDT' : item.path === '/leverage' ? '/leverage/BTCUSDT' : item.path}
                                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${isActive(item.path) ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {item.name}
                                {item.hasDropdown && <ChevronDown className="w-3 h-3 pt-0.5" />}
                            </Link>
                            {/* Mock Dropdown Indicator - would contain submenus in full implementation */}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 text-text-secondary">
                {/* Demo Mode Toggle */}
                <div className="hidden md:flex items-center gap-2 mr-2">
                    <span className={`text-xs font-bold ${isDemoMode ? 'text-primary' : 'text-text-disabled'}`}>DEMO</span>
                    <button
                        onClick={() => toggleDemoMode(!isDemoMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${isDemoMode ? 'bg-primary/20' : 'bg-border'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isDemoMode ? 'bg-primary left-6' : 'bg-text-disabled left-1'}`}></div>
                    </button>
                </div>

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
    );
};

export default Header;
