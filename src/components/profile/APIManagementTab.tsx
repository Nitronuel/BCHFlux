import React from 'react';
import { Key, Copy, Plus, Trash2, Eye } from 'lucide-react';

const APIManagementTab: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold">API Management</h2>
                        <p className="text-text-secondary text-sm mt-1">Create and manage API keys for automated trading.</p>
                    </div>
                    <button className="px-4 py-2 bg-primary text-background rounded font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Create API Key
                    </button>
                </div>

                <div className="space-y-4">
                    {/* API Key Item */}
                    <div className="border border-border rounded-lg p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-text-primary">Trading Bot 1</div>
                                    <div className="text-xs text-text-secondary">Created: 2023-11-10 15:00</div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 md:mt-0">
                                <button className="px-3 py-1.5 border border-border rounded text-sm hover:bg-hover transition-colors">Edit Restrictions</button>
                                <button className="px-3 py-1.5 bg-sell/10 text-sell rounded text-sm hover:bg-sell/20 transition-colors flex items-center gap-1">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>

                        <div className="bg-background rounded p-4 space-y-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-text-secondary uppercase">API Key</span>
                                <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                                    <span className="font-mono text-sm">vm29...9x8z</span>
                                    <Copy className="w-4 h-4 text-text-secondary cursor-pointer hover:text-text-primary" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-text-secondary uppercase">Secret Key</span>
                                <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                                    <span className="font-mono text-sm">****************</span>
                                    <Eye className="w-4 h-4 text-text-secondary cursor-pointer hover:text-text-primary" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-surface border border-border rounded text-xs text-text-secondary">Read-only</span>
                            <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-xs text-primary">Spot Trading</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
                <div className="mt-1">
                    <Key className="w-5 h-5 text-warning" />
                </div>
                <div>
                    <h4 className="font-bold text-warning mb-1">Security Tip</h4>
                    <p className="text-sm text-text-secondary">Do not share your API Key and Secret Key with anyone. BCHFlux will never ask for your API credentials.</p>
                </div>
            </div>
        </div>
    );
};

export default APIManagementTab;
