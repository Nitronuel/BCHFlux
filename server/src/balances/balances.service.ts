import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../auth/supabase.service';

@Injectable()
export class BalancesService {
    constructor(private readonly supabaseService: SupabaseService) { }

    // Get balance for a specific token
    async getBalance(userId: string, symbol: string, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        const { data, error } = await admin
            .from('balances')
            .select('*')
            .eq('user_id', userId)
            .eq('token_symbol', symbol)
            .eq('is_demo', isDemo)
            .single();

        if (error || !data) {
            // If checking balance logic is strict, we might want to return 0 or create entry
            // For now, return a default object if not found
            return { available: 0, locked: 0 };
        }

        return data;
    }

    // Get all balances for a user (filtered by demo mode)
    async getAllBalances(userId: string, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        const { data, error } = await admin
            .from('balances')
            .select('*')
            .eq('user_id', userId)
            .eq('is_demo', isDemo);

        if (error) throw new Error(error.message);
        return data || [];
    }

    // Lock funds when creating an order
    async lockFunds(userId: string, symbol: string, amount: number, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Get current balance
        const balance = await this.getBalance(userId, symbol, isDemo);
        require('fs').appendFileSync('server-debug.log', `[lockFunds] ${new Date().toISOString()} User: ${userId}, Symbol: ${symbol}, Amount: ${amount}, Demo: ${isDemo}, Avail: ${balance.available}\n`);

        if (balance.available < amount) {
            console.error(`[lockFunds] Insufficient balance. Req: ${amount}, Avail: ${balance.available}`);
            throw new BadRequestException(`Insufficient ${symbol} balance`);
        }

        // 2. Update balance: decrease available, increase locked
        const { error } = await admin
            .from('balances')
            .update({
                available: balance.available - amount,
                locked: balance.locked + amount,
                updated_at: new Date(),
            })
            .eq('user_id', userId)
            .eq('token_symbol', symbol)
            .eq('is_demo', isDemo);

        if (error) throw new Error(`Failed to lock funds: ${error.message}`);

        return true;
    }

    // Unlock funds (e.g., when cancelling order)
    async unlockFunds(userId: string, symbol: string, amount: number, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        const balance = await this.getBalance(userId, symbol, isDemo);

        // Ensure we don't unlock more than is locked
        const unlockAmount = Math.min(balance.locked, amount);

        const { error } = await admin
            .from('balances')
            .update({
                available: balance.available + unlockAmount,
                locked: balance.locked - unlockAmount,
                updated_at: new Date(),
            })
            .eq('user_id', userId)
            .eq('token_symbol', symbol)
            .eq('is_demo', isDemo);

        if (error) throw new Error(`Failed to unlock funds: ${error.message}`);
        return true;
    }

    // Process a trade (Credit one asset, Debit locked funds of another)
    // Debit side: funds are already locked, so we just burn them (decrease locked)
    // Credit side: just add to available
    async processTrade(userId: string, debitSymbol: string, debitAmount: number, creditSymbol: string, creditAmount: number, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Debit (Decrease Locked)
        const debitBal = await this.getBalance(userId, debitSymbol, isDemo);
        const { error: err1 } = await admin
            .from('balances')
            .update({
                locked: Math.max(0, debitBal.locked - debitAmount),
                updated_at: new Date()
            })
            .eq('user_id', userId)
            .eq('token_symbol', debitSymbol)
            .eq('is_demo', isDemo);

        if (err1) throw new Error(`Trade failed (Debit): ${err1.message}`);

        // 2. Credit (Increase Available)
        // Check if credit balance exists first
        let creditBal = await this.getBalance(userId, creditSymbol, isDemo);

        if (creditBal.available === 0 && creditBal.locked === 0) {
            // Create if not exists
            await admin
                .from('balances')
                .upsert({
                    user_id: userId,
                    token_symbol: creditSymbol,
                    available: creditAmount,
                    is_demo: isDemo
                }, { onConflict: 'user_id, token_symbol, is_demo' });
        } else {
            const { error: err2 } = await admin
                .from('balances')
                .update({
                    available: creditBal.available + creditAmount,
                    updated_at: new Date()
                })
                .eq('user_id', userId)
                .eq('token_symbol', creditSymbol)
                .eq('is_demo', isDemo);

            if (err2) throw new Error(`Trade failed (Credit): ${err2.message}`);
        }

        return true;
    }
    // Transfer funds from User A (Locked) to User B (Available)
    // Used for Streams/Payroll settlement
    async transferLockedToAvailable(fromUserId: string, toUserId: string, symbol: string, amount: number, isDemo: boolean = false) {
        const admin = this.supabaseService.getAdminClient();

        // 1. Debit Sender (Decrease Locked)
        const senderBal = await this.getBalance(fromUserId, symbol, isDemo);
        const { error: err1 } = await admin
            .from('balances')
            .update({
                locked: Math.max(0, senderBal.locked - amount),
                updated_at: new Date()
            })
            .eq('user_id', fromUserId)
            .eq('token_symbol', symbol)
            .eq('is_demo', isDemo);

        if (err1) throw new Error(`Transfer failed (Debit): ${err1.message}`);

        // 2. Credit Receiver (Increase Available)
        let receiverBal = await this.getBalance(toUserId, symbol, isDemo);

        if (receiverBal.available === 0 && receiverBal.locked === 0) {
            // Create if not exists
            await admin
                .from('balances')
                .upsert({
                    user_id: toUserId,
                    token_symbol: symbol,
                    available: amount,
                    is_demo: isDemo
                }, { onConflict: 'user_id, token_symbol, is_demo' });
        } else {
            const { error: err2 } = await admin
                .from('balances')
                .update({
                    available: receiverBal.available + amount,
                    updated_at: new Date()
                })
                .eq('user_id', toUserId)
                .eq('token_symbol', symbol)
                .eq('is_demo', isDemo);

            if (err2) throw new Error(`Transfer failed (Credit): ${err2.message}`);
        }

        return true;
    }
}
