
import React, { useState } from 'react';
import { X, Plus, Trash2, Clock, DollarSign, User } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { useUiStore } from '../../store/uiStore';
import { streamService } from '../../services/streamService';

interface CreateStreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface RecipientInput {
    address: string;
    amount: string;
    duration: string; // in hours for simplicity in UI, converted to seconds
}

const CreateStreamModal: React.FC<CreateStreamModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { userId, isDemoMode } = useUserStore();
    const { addToast } = useUiStore((state) => state);
    const [name, setName] = useState('');
    const [recipients, setRecipients] = useState<RecipientInput[]>([
        { address: userId || '', amount: '', duration: '24' } // Default to self for easy testing
    ]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const addRecipient = () => {
        setRecipients([...recipients, { address: '', amount: '', duration: '24' }]);
    };

    const removeRecipient = (index: number) => {
        if (recipients.length > 1) {
            setRecipients(recipients.filter((_, i: number) => i !== index));
        }
    };

    const updateRecipient = (index: number, field: keyof RecipientInput, value: string) => {
        const newRecipients = [...recipients];
        newRecipients[index][field] = value;
        setRecipients(newRecipients);
    };

    const totalCost = recipients.reduce((sum: number, r: RecipientInput) => sum + (parseFloat(r.amount) || 0), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            addToast('You must be logged in', 'error');
            return;
        }

        if (totalCost <= 0) {
            addToast('Total allocation must be greater than 0', 'error');
            return;
        }

        setIsLoading(true);
        try {
            // Convert to backend format
            const recipientData = recipients.map(r => ({
                address: r.address,
                amount: parseFloat(r.amount),
                durationSeconds: parseFloat(r.duration) * 3600
            }));

            await streamService.createStream(userId, name, recipientData, isDemoMode);

            addToast('Payroll Stream Created Successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to create stream:', error);
            addToast(error.response?.data?.message || 'Failed to create stream', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-text-primary">Create Payroll Stream</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Stream Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Stream Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Engineering Team - October"
                            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    {/* Recipients List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-text-secondary">Recipients</label>
                            <button
                                type="button"
                                onClick={addRecipient}
                                className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add Recipient
                            </button>
                        </div>

                        {recipients.map((recipient: RecipientInput, index: number) => (
                            <div key={index} className="p-4 bg-background border border-border rounded-lg space-y-4 relative group">
                                {recipients.length > 1 && (
                                    <button
                                        onClick={() => removeRecipient(index)}
                                        className="absolute top-2 right-2 text-text-disabled hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Address */}
                                    <div className="space-y-1">
                                        <label className="text-xs text-text-secondary flex items-center gap-1">
                                            <User className="w-3 h-3" /> Wallet / User ID
                                        </label>
                                        <input
                                            type="text"
                                            value={recipient.address}
                                            onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                                            placeholder="User ID or Wallet Address"
                                            className="w-full bg-surface border border-border rounded p-2 text-sm text-white focus:border-primary outline-none"
                                        />
                                    </div>

                                    {/* Amount & Duration */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-text-secondary flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> Amount (BCH)
                                            </label>
                                            <input
                                                type="number"
                                                value={recipient.amount}
                                                onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-surface border border-border rounded p-2 text-sm text-white focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-text-secondary flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Duration (Hours)
                                            </label>
                                            <input
                                                type="number"
                                                value={recipient.duration}
                                                onChange={(e) => updateRecipient(index, 'duration', e.target.value)}
                                                placeholder="24"
                                                className="w-full bg-surface border border-border rounded p-2 text-sm text-white focus:border-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-surface flex items-center justify-between">
                    <div>
                        <p className="text-sm text-text-secondary">Total Allocation Required</p>
                        <p className="text-2xl font-bold text-primary">{totalCost.toFixed(4)} BCH</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || totalCost === 0}
                            className="px-6 py-2 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? 'Creating...' : 'Create Stream'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateStreamModal;
