import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
    imports: [ConfigModule],
    controllers: [AuthController],
    providers: [AuthService, SupabaseService],
    exports: [AuthService, SupabaseService],
})
export class AuthModule { }
