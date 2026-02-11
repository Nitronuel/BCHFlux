import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AuthService {
    constructor(private supabaseService: SupabaseService) { }

    /**
     * Register a new user with email and password
     */
    async signUp(email: string, password: string) {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    /**
     * Login with email and password
     */
    async signIn(email: string, password: string) {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    /**
     * Logout user
     */
    async signOut(accessToken: string) {
        const supabase = this.supabaseService.getClient();

        const { error } = await supabase.auth.signOut();

        if (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }

        return { message: 'Logged out successfully' };
    }

    /**
     * Get user from JWT token
     */
    async getUser(accessToken: string) {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error) {
            throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
        }

        return data.user;
    }

    /**
     * Verify and decode JWT token
     */
    async verifyToken(token: string) {
        try {
            const user = await this.getUser(token);
            return { valid: true, user };
        } catch {
            return { valid: false, user: null };
        }
    }

    /**
     * Get user profile from database
     */
    async getProfile(userId: string) {
        const supabase = this.supabaseService.getAdminClient();

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            // If no profile exists, return null (we'll create one on first login)
            return null;
        }

        return data;
    }

    /**
     * Create or update user profile
     */
    async upsertProfile(userId: string, profile: { username?: string; avatar_url?: string }) {
        const supabase = this.supabaseService.getAdminClient();

        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...profile,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }

        return data;
    }
}
