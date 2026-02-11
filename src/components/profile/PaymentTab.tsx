import React from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';

const PaymentTab: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Payment Methods</h2>
                        <p className="text-text-secondary text-sm mt-1">Manage your bank accounts and payment options for P2P trading.</p>
                    </div>
                    <button className="px-4 py-2 bg-primary text-background rounded font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Payment Method
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Bank Transfer */}
                    <div className="border border-border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-primary">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-text-primary">Bank Transfer</div>
                                <div className="text-sm text-text-secondary">Chase Bank •••• 4242</div>
                                <div className="text-xs text-text-secondary mt-1">Added on 2023-10-01</div>
                            </div>
                        </div>
                        <button className="text-sell hover:text-sell/80 transition-colors bg-sell/10 p-2 rounded mt-4 md:mt-0">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* PayPal */}
                    <div className="border border-border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-primary">
                                <span className="font-bold text-xs">PP</span>
                            </div>
                            <div>
                                <div className="font-bold text-text-primary">PayPal</div>
                                <div className="text-sm text-text-secondary">user@example.com</div>
                                <div className="text-xs text-text-secondary mt-1">Added on 2023-11-15</div>
                            </div>
                        </div>
                        <button className="text-sell hover:text-sell/80 transition-colors bg-sell/10 p-2 rounded mt-4 md:mt-0">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">P2P Settings</h2>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                        <div>
                            <div className="font-medium">Auto-Reply Message</div>
                            <div className="text-sm text-text-secondary">Sending automatic messages to counterparties in P2P chat.</div>
                        </div>
                        <button className="text-primary hover:text-white transition-colors text-sm font-medium">Configure</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentTab;
