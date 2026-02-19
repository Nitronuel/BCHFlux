
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../auth/supabase.service';
import { BalancesService } from '../balances/balances.service';

export interface CreateStreamDto {
    name: string;
    tokenSymbol?: string;
    recipients: {
        address: string; // Can be user ID or wallet address. For now assuming User ID for simplicity in 'processTrade'
        amount: number;
        durationSeconds: number;
    }[];
}

@Injectable()
export class StreamsService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly balancesService: BalancesService
    ) { }

    async createStream(employerId: string, dto: CreateStreamDto, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();
        const symbol = dto.tokenSymbol || 'BCH';

        // 1. Calculate Total Allocation
        const totalAllocation = dto.recipients.reduce((sum, r) => sum + r.amount, 0);

        // 2. Lock Funds
        await this.balancesService.lockFunds(employerId, symbol, totalAllocation, isDemo);

        // 3. Create Stream Record
        const { data: stream, error: streamError } = await admin
            .from('streams')
            .insert({
                employer_id: employerId,
                name: dto.name,
                total_allocation: totalAllocation,
                remaining_allocation: totalAllocation,
                token_symbol: symbol,
                status: 'active'
            })
            .select()
            .single();

        if (streamError) throw new BadRequestException(`Failed to create stream: ${streamError.message}`);

        // 4. Create Recipients
        const now = new Date();
        const recipientsData = dto.recipients.map(r => {
            const startTime = now;
            const endTime = new Date(now.getTime() + r.durationSeconds * 1000);
            const rate = r.amount / r.durationSeconds; // Amount per second

            return {
                stream_id: stream.id,
                recipient_address: r.address,
                allocation: r.amount,
                start_time: startTime,
                end_time: endTime,
                rate_per_second: rate,
                withdrawn_amount: 0,
                last_claim_time: startTime
            };
        });

        const { error: recipientsError } = await admin
            .from('stream_recipients')
            .insert(recipientsData);

        if (recipientsError) throw new BadRequestException(`Failed to add recipients: ${recipientsError.message}`);

        return stream;
    }

    async getStreamsByEmployer(employerId: string) {
        const client = this.supabaseService.getClient(); // RLS should handle this if policies exist, but we use admin for now to be safe with our custom auth
        const admin = this.supabaseService.getAdminClient();

        const { data, error } = await admin
            .from('streams')
            .select('*, stream_recipients(*)')
            .eq('employer_id', employerId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async getStreamsByRecipient(address: string) {
        const admin = this.supabaseService.getAdminClient();

        const { data, error } = await admin
            .from('stream_recipients')
            .select('*, streams!inner(*)') // Inner join to get stream details
            .eq('recipient_address', address)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async withdraw(recipientId: string, amount?: number) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Get Recipient Record
        const { data: recipient, error: fetchError } = await admin
            .from('stream_recipients')
            .select('*, streams(*)')
            .eq('id', recipientId)
            .single();

        if (fetchError || !recipient) throw new NotFoundException('Stream recipient not found');

        // 2. Calculate Claimable
        const now = new Date();
        const lastClaim = new Date(recipient.last_claim_time);
        const endTime = new Date(recipient.end_time);

        // Effective end time is min(now, endTime)
        const effectiveNow = now > endTime ? endTime : now;

        const elapsedSeconds = (effectiveNow.getTime() - lastClaim.getTime()) / 1000;

        if (elapsedSeconds <= 0) {
            return { message: 'Nothing to claim yet', withdrawn: 0 };
        }

        const accrued = elapsedSeconds * recipient.rate_per_second;

        // Cap at allocation - withdrawn (safety check)
        const remainingTotal = recipient.allocation - recipient.withdrawn_amount;
        let claimable = Math.min(accrued, remainingTotal);

        if (amount) {
            if (amount > claimable) throw new BadRequestException(`Requested ${amount} but only ${claimable} is available`);
            claimable = amount;
        }

        if (claimable <= 0) return { message: 'Nothing to claim', withdrawn: 0 };

        // 3. Process Transfer
        // Employer -> Recipient
        // We assume 'recipient.recipient_address' IS the User ID for now. 
        // If it's a wallet address string, we can't credit an internal User ID balance unless we resolve it.
        // For this feature, we assume the user enters valid User IDs (or we map them).
        // Let's assume recipient_address === userId for internal transfers.

        // 3. Process Transfer
        // Employer (Locked) -> Recipient (Available)
        await this.balancesService.transferLockedToAvailable(
            recipient.streams.employer_id,
            recipient.recipient_address, // Target User ID
            recipient.streams.token_symbol,
            claimable
        );

        // 4. Update Records
        // Update Recipient


        // Wait, if I claim partial, my `last_claim_time` should NOT be `now`.
        // It should be `last_claim + (amount / rate)`.

        let newLastClaimTime = effectiveNow;
        if (amount && amount < accrued) {
            const timePaidFor = (amount / recipient.rate_per_second) * 1000; // ms
            newLastClaimTime = new Date(lastClaim.getTime() + timePaidFor);
        }

        await admin
            .from('stream_recipients')
            .update({
                withdrawn_amount: recipient.withdrawn_amount + claimable,
                last_claim_time: newLastClaimTime
            })
            .eq('id', recipientId);

        // Update Stream Remaining (Visual only mostly, but good for tracking)
        await admin
            .from('streams')
            .update({
                remaining_allocation: recipient.streams.remaining_allocation - claimable
            })
            .eq('id', recipient.streams.id);

        return {
            success: true,
            withdrawn: claimable,
            newBalance: recipient.withdrawn_amount + claimable
        };
    }
}
