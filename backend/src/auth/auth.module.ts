import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy.js';


@Module({
  imports: [JwtModule.register({
    secret:'temporary-secret-change-later',
    signOptions: { expiresIn: '7d' }
  }),
],
  providers: [AuthService, PrismaService, JwtStrategy],
  controllers: [AuthController]
})
export class AuthModule {}
