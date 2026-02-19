
import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { useUiStore } from '../../store/uiStore';
import { streamService, type Stream } from '../../services/streamService';
import CreateStreamModal from './CreateStreamModal';
import { Plus, Users } from 'lucide-react';

const StreamRow: React.FC<{ stream: Stream }> = ({ stream }) => {
    const [remaining, setRemaining] = useState(stream.remaining_allocation);
    const [progressPct, setProgressPct] = useState(0);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10';
            case 'completed': return 'text-blue-500 bg-blue-500/10';
            case 'paused': return 'text-yellow-500 bg-yellow-500/10';
            default: return 'text-red-500 bg-red-500/10';
        }
    };

    useEffect(() => {
        if (stream.status !== 'active' || !stream.stream_recipients) return;

        const totalRate = stream.stream_recipients.reduce((acc, r) => acc + Number(r.rate_per_second), 0);
        if (totalRate === 0) return;

        // Find the earliest start time ensuring we don't pick a future one if logic varies
        // For now assume all start roughly same time or take the min
        const startTime = Math.min(...stream.stream_recipients.map(r => new Date(r.start_time).getTime()));
        const totalAlloc = stream.total_allocation;

        const update = () => {
            const now = Date.now();
            const elapsedSeconds = Math.max(0, (now - startTime) / 1000);

            // Calculate how much has nominally flowed
            const flowed = elapsedSeconds * totalRate;

            // Remaining = Total - Flowed
            // But we must respect the database 'remaining_allocation' as the truth anchor?
            // Actually the DB remaining updates on 'withdraw' or 'tick'? 
            // Usually DB has a static 'allocation' and 'withdrawn'. 'Remaining' implies 'Not Withdrawn'?
            // Logic check:
            // "Remaining" in user request context: "figures reducing".
            // If it means "Money not yet earned by employee": Reducing.
            // If it means "Money in contract": Reducing only on withdrawal?
            // User says "decimals reducing... micro payments that is done per second".
            // This means they want to see the "Unvested" amount dropping.

            const currentRemaining = Math.max(0, totalAlloc - flowed);
            setRemaining(currentRemaining);

            const prog = Math.min(100, (flowed / totalAlloc) * 100);
            setProgressPct(prog);

            if (currentRemaining > 0) {
                requestAnimationFrame(update);
            }
        };

        const raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [stream]);

    return (
        <div className="p-6 transition-colors hover:bg-background/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h4 className="font-bold text-white text-lg">{stream.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${getStatusColor(stream.status)}`}>
                            {stream.status}
                        </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                        Created {new Date(stream.created_at).toLocaleDateString()} • {stream.stream_recipients?.length || 0} Recipients
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Total Allocation</p>
                        <p className="font-mono text-lg text-primary">{stream.total_allocation.toFixed(4)} {stream.token_symbol}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-text-secondary uppercase tracking-wider mb-1">Remaining (Vesting)</p>
                        <p className="font-mono text-lg text-white tabular-nums">{remaining.toFixed(8)} {stream.token_symbol}</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                    <span>Progress</span>
                    <span>{progressPct.toFixed(1)}% Disbursed</span>
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${progressPct}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

const StreamDashboard: React.FC = () => {
    const { userId } = useUserStore();
    const { addToast } = useUiStore((state) => state);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadStreams = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await streamService.getEmployerStreams(userId);
            setStreams(data);
        } catch (error) {
            console.error('Failed to load streams:', error);
            addToast('Failed to load your streams', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStreams();
    }, [userId]);



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Payroll Dashboard</h2>
                    <p className="text-text-secondary text-sm mt-1">Manage your active payment streams</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Create New Stream
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-text-secondary text-sm">Total Active Streams</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {streams.filter(s => s.status === 'active').length}
                    </p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-text-secondary text-sm">Total BCH Allocated</p>
                    <p className="text-2xl font-bold text-primary mt-1">
                        {streams.reduce((acc, s) => acc + s.total_allocation, 0).toFixed(4)} BCH
                    </p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-text-secondary text-sm">Total Employees</p>
                    <p className="text-2xl font-bold text-white mt-1">
                        {streams.reduce((acc, s) => acc + (s.stream_recipients?.length || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Streams List */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h3 className="font-bold text-white">Active Contracts</h3>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-text-secondary">Loading streams...</div>
                ) : streams.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center text-text-secondary">
                        <Users className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium text-white mb-1">No Payroll Streams Yet</p>
                        <p className="mb-6">Create your first stream to start paying employees in real-time.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-primary hover:underline font-medium"
                        >
                            Create Stream
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {streams.map((stream) => (
                            <StreamRow key={stream.id} stream={stream} />
                        ))}
                    </div>
                )}
            </div>

            <CreateStreamModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadStreams}
            />
        </div>
    );
};

export default StreamDashboard;
