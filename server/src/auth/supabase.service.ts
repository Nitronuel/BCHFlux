import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;
    private supabaseAdmin: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
        const supabaseServiceKey = this.configService.get<string>(
            'SUPABASE_SERVICE_ROLE_KEY',
        );

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase configuration');
        }

        // Client for user-facing operations
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Admin client for server-side operations (bypasses RLS)
        if (supabaseServiceKey) {
            this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        }
    }

    getClient(): SupabaseClient {
        return this.supabase;
    }

    getAdminClient(): SupabaseClient {
        return this.supabaseAdmin;
    }
}
