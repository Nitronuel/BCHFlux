import React from 'react';
import { BarChart2, ArrowLeftRight, TrendingUp, Wallet, Banknote } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { name: 'Markets', path: '/markets', icon: BarChart2 },
        { name: 'Trade', path: '/trade/spot/BTCUSDT', icon: ArrowLeftRight },
        { name: 'Leverage', path: '/leverage/BTCUSDT', icon: TrendingUp },
        { name: 'Wallets', path: '/wallet', icon: Wallet },
        { name: 'Bridge', path: '/bridge', icon: ArrowLeftRight },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border grid grid-cols-5 items-center z-50 lg:hidden pb-safe">
            {navItems.map((item) => (
                <Link
                    key={item.name}
                    to={item.path}
                    className={`flex flex-col items-center justify-center gap-1 p-2 h-full transition-colors ${isActive(item.path.split('/')[1] === '' ? '/' : '/' + item.path.split('/')[1])
                        ? 'text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
            ))}
        </div>
    );
};

export default BottomNav;
