
import React, { useEffect, useState, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { useUiStore } from '../../store/uiStore';
import { streamService, type StreamRecipient } from '../../services/streamService';
import { ArrowDownCircle, Wallet, Clock } from 'lucide-react';

const WithdrawalCard: React.FC<{ stream: StreamRecipient; onWithdraw: () => void }> = ({ stream, onWithdraw }) => {
    const { addToast } = useUiStore((state) => state);
    // Real-time claimable balance calculation
    const [claimable, setClaimable] = useState(0);
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const lastClaim = new Date(stream.last_claim_time).getTime();
            const end = new Date(stream.end_time).getTime();
            const effectiveNow = Math.min(now, end);

            const elapsedSeconds = Math.max(0, (effectiveNow - lastClaim) / 1000);
            const accrued = elapsedSeconds * stream.rate_per_second;

            // Safety cap
            const remainingTotal = stream.allocation - stream.withdrawn_amount;
            setClaimable(Math.min(accrued, remainingTotal));

            // Overall Progress
            const start = new Date(stream.start_time).getTime();
            const totalDuration = end - start;
            const elapsedTotal = effectiveNow - start;
            setProgress(Math.min(100, (elapsedTotal / totalDuration) * 100));

            if (now < end) {
                rafRef.current = requestAnimationFrame(update);
            }
        };

        rafRef.current = requestAnimationFrame(update);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [stream]);

    const handleWithdraw = async () => {
        if (claimable <= 0) return;
        try {
            await streamService.withdraw(stream.id);
            addToast(`Withdrew ${claimable.toFixed(8)} BCH!`, 'success');
            onWithdraw(); // Reload data
        } catch (error) {
            console.error(error);
            addToast('Withdrawal failed', 'error');
        }
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className="text-white font-bold text-lg mb-1">{stream.streams?.name || 'Incoming Stream'}</h4>
                    <p className="text-text-secondary text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Ends: {new Date(stream.end_time).toLocaleString()}
                    </p>
                </div>
                <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Streaming
                </div>
            </div>

            {/* Main Ticker */}
            <div className="text-center py-6">
                <p className="text-text-secondary text-sm mb-2 uppercase tracking-widest">Unclaimed Allowance</p>
                <div className="text-4xl md:text-5xl font-mono font-bold text-primary tabular-nums tracking-tight">
                    {claimable.toFixed(8)}
                    <span className="text-lg text-text-secondary ml-2">BCH</span>
                </div>
                <div className="mt-2 text-xs text-text-secondary">
                    Rate: {stream.rate_per_second.toFixed(8)} BCH/s
                </div>
            </div>

            <div className="flex gap-4 mt-6">
                <div className="flex-1 bg-background rounded-lg p-3 text-center border border-border">
                    <p className="text-xs text-text-secondary mb-1">Contract Rate</p>
                    <p className="font-bold text-white">{(stream.rate_per_second * 3600).toFixed(4)} BCH/hr</p>
                </div>
                <div className="flex-1 bg-background rounded-lg p-3 text-center border border-border">
                    <p className="text-xs text-text-secondary mb-1">Withdrawn</p>
                    <p className="font-bold text-white">{stream.withdrawn_amount.toFixed(4)}</p>
                </div>
            </div>

            <button
                onClick={handleWithdraw}
                disabled={claimable < 1}
                className="w-full mt-6 py-3 bg-primary text-background font-bold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <ArrowDownCircle className="w-5 h-5" />
                Claim to Wallet {claimable < 1 && '(Min 1 BCH)'}
            </button>
        </div>
    );
};

const RecipientView: React.FC = () => {
    const { userId } = useUserStore();
    const [streams, setStreams] = useState<StreamRecipient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const [incoming, outgoing] = await Promise.all([
                streamService.getRecipientStreams(userId),
                streamService.getEmployerStreams(userId).catch(() => [])
            ]);

            // Convert outgoing streams to recipient view for Demo visualization
            const outgoingAsRecipients: StreamRecipient[] = outgoing.flatMap(stream =>
                (stream.stream_recipients || []).map(recipient => ({
                    ...recipient,
                    streams: {
                        name: `${stream.name} (Preview)`,
                        token_symbol: stream.token_symbol,
                        employer_id: stream.employer_id
                    },
                    // Add a flag to indicate this is a preview only if I'm not the actual recipient
                    _isPreview: recipient.recipient_address !== userId
                }))
            );

            // Merge: Prefer actual incoming record if it exists
            const merged = [...incoming];
            outgoingAsRecipients.forEach(preview => {
                if (!merged.find(real => real.id === preview.id)) {
                    merged.push(preview);
                }
            });

            setStreams(merged);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [userId]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                Incoming Streams
            </h2>

            {isLoading ? (
                <div>Loading...</div>
            ) : streams.length === 0 ? (
                <div className="text-center p-12 bg-surface rounded-xl border border-border">
                    <p className="text-text-secondary">No active income streams found for your account.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {streams.map(stream => (
                        <WithdrawalCard key={stream.id} stream={stream} onWithdraw={loadData} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecipientView;
