import React from 'react';
import { Shield, Key, Smartphone, FileText, Lock, ChevronRight } from 'lucide-react';

const SecurityTab: React.FC = () => {
    const securityItems = [
        {
            icon: <Shield className="w-5 h-5 text-buy" />,
            title: 'Two-Factor Authentication (2FA)',
            description: 'Protect your account and transactions.',
            status: 'Enabled',
            statusColor: 'text-buy',
            action: 'Disable'
        },
        {
            icon: <Key className="w-5 h-5 text-primary" />,
            title: 'Identity Verification',
            description: 'Switch to a verified account to access all features.',
            status: 'Unverified',
            statusColor: 'text-sell',
            action: 'Verify'
        },
        {
            icon: <Lock className="w-5 h-5 text-text-primary" />,
            title: 'Login Password',
            description: 'Login password is used to log in to your account.',
            status: 'Set',
            statusColor: 'text-buy',
            action: 'Change'
        },
        {
            icon: <Smartphone className="w-5 h-5 text-text-primary" />,
            title: 'SMS Authentication',
            description: 'Use SMS to log in and withdraw.',
            status: 'Disabled',
            statusColor: 'text-text-secondary',
            action: 'Enable'
        },
        {
            icon: <FileText className="w-5 h-5 text-text-primary" />,
            title: 'Device Management',
            description: 'Manage devices allowed to access your account.',
            status: '',
            statusColor: '',
            action: 'Manage'
        },
    ];

    const devices = [
        { name: 'Chrome V119 (Windows)', location: 'New York, USA', ip: '192.168.1.1', lastActive: '2023-11-15 14:30' },
        { name: 'iPhone 14 Pro (iOS)', location: 'New York, USA', ip: '10.0.0.1', lastActive: '2023-11-14 09:12' },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">Security Settings</h2>
                <div className="space-y-4">
                    {securityItems.map((item, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-hover transition-colors">
                            <div className="flex items-start gap-4 mb-4 md:mb-0">
                                <div className="mt-1">{item.icon}</div>
                                <div>
                                    <div className="font-medium text-text-primary flex items-center gap-2">
                                        {item.title}
                                        {item.status && (
                                            <span className={`text-xs px-2 py-0.5 rounded bg-background border border-border ${item.statusColor}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-text-secondary mt-1">{item.description}</div>
                                </div>
                            </div>
                            <button className="px-4 py-1.5 border border-border rounded hover:border-primary hover:text-primary transition-colors text-sm font-medium w-fit self-end md:self-center">
                                {item.action}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Device Management Preview */}
            <div className="bg-surface border border-border rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Active Devices</h2>
                    <button className="text-primary text-sm flex items-center hover:text-white transition-colors">
                        View all <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    {devices.map((device, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                            <div>
                                <div className="font-medium text-text-primary">{device.name}</div>
                                <div className="text-sm text-text-secondary">{device.location} - {device.ip}</div>
                            </div>
                            <div className="text-sm text-text-secondary">
                                Active: {device.lastActive}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SecurityTab;
