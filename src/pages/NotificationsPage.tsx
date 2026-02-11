import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, CreditCard, Settings } from 'lucide-react';

interface Notification {
    id: string;
    type: 'system' | 'order' | 'account' | 'promotion';
    title: string;
    description: string;
    time: string;
    read: boolean;
}

const NotificationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'system' | 'order' | 'account'>('all');

    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: '1',
            type: 'order',
            title: 'Order Filled: BTC/USDT',
            description: 'Your limit buy order for 0.05 BTC at 42,000 USDT has been fully filled.',
            time: '2 mins ago',
            read: false,
        },
        {
            id: '2',
            type: 'system',
            title: 'System Maintenance Scheduled',
            description: 'Scheduled maintenance will occur on Feb 10th from 02:00 UTC to 04:00 UTC. Trading will be paused.',
            time: '1 hour ago',
            read: false,
        },
        {
            id: '3',
            type: 'account',
            title: 'Login Attempt from New Device',
            description: 'We detected a login from a new device (Chrome on Windows) in New York, USA.',
            time: '5 hours ago',
            read: true,
        },
        {
            id: '4',
            type: 'promotion',
            title: 'New Listing: SOL/USDT',
            description: 'Solana (SOL) is now available for trading on BCHFlux with 0% fees for the first week!',
            time: '1 day ago',
            read: true,
        },
        {
            id: '5',
            type: 'order',
            title: 'Stop Loss Triggered',
            description: 'Your stop loss order for ETH/USDT was triggered at 2,250 USDT.',
            time: '2 days ago',
            read: true,
        }
    ]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'order': return <Check className="w-5 h-5 text-buy" />;
            case 'system': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'account': return <Settings className="w-5 h-5 text-primary" />;
            case 'promotion': return <CreditCard className="w-5 h-5 text-purple-500" />;
            default: return <Info className="w-5 h-5 text-text-secondary" />;
        }
    };

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => n.type === activeTab);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-background text-text-primary p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">Notifications</h1>
                        <p className="text-text-secondary">Stay updated with your account activity and market news.</p>
                    </div>
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 bg-surface hover:bg-border border border-border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 w-fit"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {['all', 'system', 'order', 'account'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'all' | 'system' | 'order' | 'account')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'bg-primary text-background'
                                : 'bg-surface text-text-secondary hover:bg-border hover:text-text-primary'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === 'all' && (
                                <span className="ml-2 bg-white/20 px-1.5 py-0.5 rounded text-xs">
                                    {notifications.filter(n => !n.read).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-xl border transition-all hover:bg-surface/50 group ${notification.read
                                    ? 'bg-transparent border-surface/50 opacity-75'
                                    : 'bg-surface border-border shadow-sm'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.read ? 'bg-background' : 'bg-background/80'
                                        }`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className={`font-semibold truncate ${notification.read ? 'text-text-secondary' : 'text-white'
                                                }`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-xs text-text-disabled shrink-0">{notification.time}</span>
                                        </div>
                                        <p className="text-sm text-text-secondary line-clamp-2">{notification.description}</p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-surface/30 rounded-xl border border-dashed border-border">
                            <Bell className="w-12 h-12 text-text-disabled mx-auto mb-4" />
                            <p className="text-text-secondary">No notifications found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
