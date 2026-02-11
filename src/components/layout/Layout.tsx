import React from 'react';
import Header from './Header';
import BottomNav from './BottomNav';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 overflow-x-hidden pt-16">
                {children}
            </main>
            <BottomNav />
        </div>
    );
};

export default Layout;
