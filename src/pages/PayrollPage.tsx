
import React, { useState } from 'react';
import StreamDashboard from '../components/payroll/StreamDashboard';
import RecipientView from '../components/payroll/RecipientView';

const PayrollPage: React.FC = () => {
    // Simple tab switching for demo purposes, or we can use sub-routes
    // Let's use tabs on a single page for a cohesive "Tool" feel.
    const [activeTab, setActiveTab] = useState<'employer' | 'employee'>('employer');

    return (
        <div className="min-h-screen bg-background pt-20 pb-24 lg:pb-10 px-4 md:px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Real-time Payroll</h1>
                        <p className="text-text-secondary mt-2">
                            Stream BCH salaries to employees second-by-second. Anonymous, instant, and automated.
                        </p>
                    </div>

                    {/* Role Switcher */}
                    <div className="bg-surface p-1 rounded-lg border border-border inline-flex">
                        <button
                            onClick={() => setActiveTab('employer')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'employer'
                                ? 'bg-primary text-background shadow-lg'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            Employer Demo
                        </button>
                        <button
                            onClick={() => setActiveTab('employee')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'employee'
                                ? 'bg-primary text-background shadow-lg'
                                : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            Employee View
                        </button>
                    </div>
                </div>

                {activeTab === 'employer' ? <StreamDashboard /> : <RecipientView />}
            </div>
        </div>
    );
};

export default PayrollPage;
