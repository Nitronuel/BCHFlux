import React from 'react';
import { CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';

const IdentificationTab: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold">Personal Verification</h2>
                        <p className="text-text-secondary text-sm mt-1">Verify your identity to increase withdrawal limits and access more features.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Basic */}
                    <div className="border border-border rounded-lg p-6 flex flex-col h-full bg-background/50">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="tex-lg font-bold text-text-secondary">Basic</h3>
                            <span className="flex items-center gap-1 text-buy text-xs font-bold bg-buy/10 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3" /> VERIFIED
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="text-sm text-text-secondary flex gap-2">
                                <CheckCircle className="w-4 h-4 text-buy shrink-0" /> Personal Info
                            </li>
                            <li className="text-sm text-text-secondary flex gap-2">
                                <CheckCircle className="w-4 h-4 text-buy shrink-0" /> Government ID
                            </li>
                            <li className="text-sm text-text-secondary flex gap-2">
                                <CheckCircle className="w-4 h-4 text-buy shrink-0" /> Facial Recognition
                            </li>
                        </ul>
                        <div className="border-t border-border pt-4 mt-auto">
                            <div className="text-xs text-text-secondary mb-1">Daily Withdrawal Limit</div>
                            <div className="font-bold">50,000 USDT</div>
                        </div>
                    </div>

                    {/* Advanced */}
                    <div className="border border-primary rounded-lg p-6 flex flex-col h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-primary text-background text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="tex-lg font-bold text-text-primary">Advanced</h3>
                            <span className="flex items-center gap-1 text-text-disabled text-xs font-bold bg-surface border border-border px-2 py-1 rounded">
                                <AlertCircle className="w-3 h-3" /> UNVERIFIED
                            </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="text-sm text-text-primary flex gap-2">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0" /> Proof of Address
                            </li>
                            <li className="text-sm text-text-primary flex gap-2">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0" /> Review typically takes 2 days
                            </li>
                        </ul>
                        <button className="w-full py-2 bg-primary text-background rounded font-bold hover:bg-opacity-90 transition-colors mb-4">
                            Verify Now
                        </button>
                        <div className="border-t border-border pt-4 mt-auto">
                            <div className="text-xs text-text-secondary mb-1">Daily Withdrawal Limit</div>
                            <div className="font-bold">2,000,000 USDT</div>
                        </div>
                    </div>

                    {/* Enterprise */}
                    <div className="border border-border rounded-lg p-6 flex flex-col h-full bg-background/50">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="tex-lg font-bold text-text-secondary">Enterprise</h3>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="text-sm text-text-secondary flex gap-2">
                                <ChevronRight className="w-4 h-4 text-text-disabled shrink-0" /> Increased Limits
                            </li>
                            <li className="text-sm text-text-secondary flex gap-2">
                                <ChevronRight className="w-4 h-4 text-text-disabled shrink-0" /> OTC Trading Desk
                            </li>
                            <li className="text-sm text-text-secondary flex gap-2">
                                <ChevronRight className="w-4 h-4 text-text-disabled shrink-0" /> Exclusive Support
                            </li>
                        </ul>
                        <button className="w-full py-2 bg-surface text-text-primary border border-border rounded font-bold hover:bg-hover transition-colors mb-4">
                            Contact Us
                        </button>
                        <div className="border-t border-border pt-4 mt-auto">
                            <div className="text-xs text-text-secondary mb-1">Daily Withdrawal Limit</div>
                            <div className="font-bold">Unlimited</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdentificationTab;
