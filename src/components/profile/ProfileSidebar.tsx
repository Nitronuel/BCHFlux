import React from 'react';
import { LayoutDashboard, Shield, User, CreditCard, Key, Settings } from 'lucide-react';

interface ProfileSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { name: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: 'Security', icon: <Shield className="w-4 h-4" /> },
        { name: 'Identification', icon: <User className="w-4 h-4" /> },
        { name: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
        { name: 'API Management', icon: <Key className="w-4 h-4" /> },
        { name: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ];

    return (
        <div className="lg:col-span-1 bg-surface rounded-lg border border-border p-4 h-fit">
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-background font-bold text-lg">
                    U
                </div>
                <div>
                    <div className="font-bold text-text-primary">User12345</div>
                    <div className="text-xs text-text-secondary">UID: 8439201</div>
                </div>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setActiveTab(item.name)}
                        className={`w-full text-left px-4 py-3 rounded-md transition-colors font-medium flex items-center gap-3 ${activeTab === item.name
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                            }`}
                    >
                        {item.icon}
                        {item.name}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default ProfileSidebar;
