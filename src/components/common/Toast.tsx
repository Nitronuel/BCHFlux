import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUiStore, type ToastType } from '../../store/uiStore';

const Toast: React.FC = () => {
    const { toasts, removeToast } = useUiStore();

    if (toasts.length === 0) return null;

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-buy" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-sell" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
            default: return <Info className="w-5 h-5 text-primary" />;
        }
    };

    const getBorderColor = (type: ToastType) => {
        switch (type) {
            case 'success': return 'border-buy/50';
            case 'error': return 'border-sell/50';
            case 'warning': return 'border-warning/50';
            default: return 'border-primary/50';
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`min-w-[300px] bg-surface border ${getBorderColor(toast.type)} rounded shadow-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300`}
                >
                    <div className="shrink-0 mt-0.5">
                        {getIcon(toast.type)}
                    </div>
                    <div className="flex-1 text-sm text-text-primary">
                        {toast.message}
                    </div>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;
