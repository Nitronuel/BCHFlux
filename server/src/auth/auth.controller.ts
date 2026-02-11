import {
    Controller,
    Post,
    Get,
    Body,
    Headers,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';

class SignUpDto {
    email: string;
    password: string;
}

class SignInDto {
    email: string;
    password: string;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * POST /api/auth/signup
     * Register a new user
     */
    @Post('signup')
    async signUp(@Body() body: SignUpDto) {
        if (!body.email || !body.password) {
            throw new HttpException(
                'Email and password are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        return this.authService.signUp(body.email, body.password);
    }

    /**
     * POST /api/auth/login
     * Login with email and password
     */
    @Post('login')
    async login(@Body() body: SignInDto) {
        if (!body.email || !body.password) {
            throw new HttpException(
                'Email and password are required',
                HttpStatus.BAD_REQUEST,
            );
        }

        return this.authService.signIn(body.email, body.password);
    }

    /**
     * POST /api/auth/logout
     * Logout current user
     */
    @Post('logout')
    async logout(@Headers('authorization') authHeader: string) {
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
        }

        return this.authService.signOut(token);
    }

    /**
     * GET /api/auth/me
     * Get current user info
     */
    @Get('me')
    async getMe(@Headers('authorization') authHeader: string) {
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            throw new HttpException('No token provided', HttpStatus.UNAUTHORIZED);
        }

        const user = await this.authService.getUser(token);
        const profile = await this.authService.getProfile(user.id);

        return {
            user,
            profile,
        };
    }

    /**
     * GET /api/auth/verify
     * Verify if token is valid
     */
    @Get('verify')
    async verifyToken(@Headers('authorization') authHeader: string) {
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return { valid: false };
        }

        return this.authService.verifyToken(token);
    }
}
