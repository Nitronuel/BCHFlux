import React from 'react';
import { LineChart, BookOpen, Activity } from 'lucide-react';


// We will use slots or children to render the content. 
// BUT, since we need to toggle visibility of children based on active tab, 
// and the children (Chart, OrderBook) are heavy, we might want to keep them mounted 
// but hidden, OR unmount them. Keeping Chart mounted is usually better for performance/data.

// Actually, simpler approach: This component just renders the Tabs, 
// and the Parent controls what is shown. 
// OR, we pass the components as props.

interface Props {
    activeTab: 'chart' | 'book' | 'trades';
    onTabChange: (tab: 'chart' | 'book' | 'trades') => void;
}

const TradeVisualTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex border-b border-border bg-surface">
            <button
                onClick={() => onTabChange('chart')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                    ${activeTab === 'chart' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <LineChart className="w-4 h-4" />
                Chart
            </button>
            <button
                onClick={() => onTabChange('book')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                    ${activeTab === 'book' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <BookOpen className="w-4 h-4" />
                Book
            </button>
            <button
                onClick={() => onTabChange('trades')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors
                    ${activeTab === 'trades' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            >
                <Activity className="w-4 h-4" />
                Trades
            </button>
        </div>
    );
};

export default TradeVisualTabs;
