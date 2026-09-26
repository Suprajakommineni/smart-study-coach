
import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy.js";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not defined");
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        expiresIn: "1d",
      },
    }),
  ],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
  ],
  controllers: [AuthController],
})
export class AuthModule {}

