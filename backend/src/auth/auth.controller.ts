import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('signup')
    async register(@Body('email') email: string, @Body('password') password: string) {
        return this.authService.signup(email, password)
    }
    @Post('login')
    async login(@Body('email') email: string, @Body('password') password: string) {
        return this.authService.login(email, password)
    }
}
