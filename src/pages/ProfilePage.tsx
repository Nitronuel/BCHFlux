import React, { useState } from 'react';
import ProfileSidebar from '../components/profile/ProfileSidebar';
import DashboardTab from '../components/profile/DashboardTab';
import SecurityTab from '../components/profile/SecurityTab';
import IdentificationTab from '../components/profile/IdentificationTab';
import PaymentTab from '../components/profile/PaymentTab';
import APIManagementTab from '../components/profile/APIManagementTab';
import SettingsTab from '../components/profile/SettingsTab';

const ProfilePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'Dashboard':
                return <DashboardTab />;
            case 'Security':
                return <SecurityTab />;
            case 'Identification':
                return <IdentificationTab />;
            case 'Payment':
                return <PaymentTab />;
            case 'API Management':
                return <APIManagementTab />;
            case 'Settings':
                return <SettingsTab />;
            default:
                return <DashboardTab />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Component */}
                <ProfileSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-surface rounded-lg border border-border p-6 min-h-[600px]">
                        <h1 className="text-2xl font-bold mb-6 border-b border-border pb-4">{activeTab}</h1>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
