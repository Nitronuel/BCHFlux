import React, { useState } from 'react';
import { Moon, Sun, Globe, Bell, DollarSign, Monitor } from 'lucide-react';

const SettingsTab: React.FC = () => {
    const [theme, setTheme] = useState('dark');
    const [language, setLanguage] = useState('English');
    const [currency, setCurrency] = useState('USD');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        marketing: false
    });

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">Preferences</h2>

                <div className="space-y-6">
                    {/* Theme */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-border">
                        <div className="flex items-start gap-4 mb-4 md:mb-0">
                            <div className="mt-1 text-text-secondary"><Moon className="w-5 h-5" /></div>
                            <div>
                                <div className="font-medium text-text-primary">Theme Mode</div>
                                <div className="text-sm text-text-secondary">Select your preferred interface theme.</div>
                            </div>
                        </div>
                        <div className="flex bg-background rounded-lg p-1 border border-border">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${theme === 'light' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Sun className="w-4 h-4" /> Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Moon className="w-4 h-4" /> Dark
                            </button>
                            <button
                                onClick={() => setTheme('system')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <Monitor className="w-4 h-4" /> System
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-border">
                        <div className="flex items-start gap-4 mb-4 md:mb-0">
                            <div className="mt-1 text-text-secondary"><Globe className="w-5 h-5" /></div>
                            <div>
                                <div className="font-medium text-text-primary">Language</div>
                                <div className="text-sm text-text-secondary">Select your preferred language.</div>
                            </div>
                        </div>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-background border border-border rounded px-4 py-2 text-sm text-text-primary outline-none focus:border-primary min-w-[150px]"
                        >
                            <option value="English">English</option>
                            <option value="Spanish">Español</option>
                            <option value="French">Français</option>
                            <option value="Chinese">中文</option>
                        </select>
                    </div>

                    {/* Currency */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex items-start gap-4 mb-4 md:mb-0">
                            <div className="mt-1 text-text-secondary"><DollarSign className="w-5 h-5" /></div>
                            <div>
                                <div className="font-medium text-text-primary">Currency</div>
                                <div className="text-sm text-text-secondary">Select your preferred display currency.</div>
                            </div>
                        </div>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="bg-background border border-border rounded px-4 py-2 text-sm text-text-primary outline-none focus:border-primary min-w-[150px]"
                        >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="JPY">JPY - Japanese Yen</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">Notifications</h2>
                <div className="space-y-4">
                    {[
                        { key: 'email', label: 'Email Notifications', desc: 'Receive security alerts and account updates via email.' },
                        { key: 'push', label: 'Push Notifications', desc: 'Receive real-time alerts on your device.' },
                        { key: 'marketing', label: 'Marketing Updates', desc: 'Receive news, promotions, and product updates.' }
                    ].map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-4 bg-background border border-border rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 text-text-secondary"><Bell className="w-4 h-4" /></div>
                                <div>
                                    <div className="font-medium text-text-primary">{item.label}</div>
                                    <div className="text-sm text-text-secondary">{item.desc}</div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={notifications[item.key as keyof typeof notifications]}
                                    onChange={() => toggleNotification(item.key as keyof typeof notifications)}
                                />
                                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;
