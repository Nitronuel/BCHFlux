import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './auth/supabase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('airdrop-all')
  async airdropAll() {
    const admin = this.supabaseService.getAdminClient();

    // 1. List all users
    const { data: { users }, error } = await admin.auth.admin.listUsers();
    if (error) throw new Error(error.message);

    const updates: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    // 2. For each user, add 10 BCH
    for (const user of users) {
      try {
        // Check existing balance
        const { data: balance } = await admin
          .from('balances')
          .select('*')
          .eq('user_id', user.id)
          .eq('token_symbol', 'BCH')
          .eq('is_demo', false) // Target real accounts
          .single();

        if (balance) {
          // Update
          await admin
            .from('balances')
            .update({
              available: balance.available + 10,
              updated_at: new Date()
            })
            .eq('id', balance.id);
        } else {
          // Insert
          await admin
            .from('balances')
            .insert({
              user_id: user.id,
              token_symbol: 'BCH',
              available: 10,
              locked: 0,
              is_demo: false
            });
        }
        updates.push(user.id);
      } catch (e) {
        errors.push({ userId: user.id, error: e.message });
      }
    }

    return {
      success: true,
      updatedCount: updates.length,
      errorCount: errors.length,
      errors
    };
  }
  @Post('dev/init')
  async initDevUser() {
    const admin = this.supabaseService.getAdminClient();
    const email = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;

    // 1. Create Auth User
    const { data: { user }, error } = await admin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true
    });

    if (error || !user) throw new Error(error?.message || 'Failed to create user');

    // 2. Ensure Real Balances (Trigger only does Demo)
    // We want to give them Real BCH for testing if they are in Real Mode
    await admin
      .from('balances')
      .upsert({
        user_id: user.id,
        token_symbol: 'BCH',
        available: 10,
        locked: 0,
        is_demo: false
      });

    return { userId: user.id, email };
  }
}
