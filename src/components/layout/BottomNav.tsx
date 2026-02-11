import React from 'react';
import { Home, BarChart2, ArrowLeftRight, TrendingUp, Wallet } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const navItems = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Markets', path: '/markets', icon: BarChart2 },
        { name: 'Trade', path: '/trade/spot/BTCUSDT', icon: ArrowLeftRight },
        { name: 'Leverage', path: '/leverage/BTCUSDT', icon: TrendingUp },
        { name: 'Wallets', path: '/wallet', icon: Wallet },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around z-50 lg:hidden pb-safe">
            {navItems.map((item) => (
                <Link
                    key={item.name}
                    to={item.path}
                    className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive(item.path.split('/')[1] === '' ? '/' : '/' + item.path.split('/')[1]) // Simple active check
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
