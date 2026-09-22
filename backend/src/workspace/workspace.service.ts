import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    name: string,
    description?: string,
    tags?: string,
  ) {
    return this.prisma.workspace.create({
      data: { userId, name, description, tags },
    });
  }

  async findAllForUser(userId: number) {
    return this.prisma.workspace.findMany({
      where: { userId },
    });
  }
}
