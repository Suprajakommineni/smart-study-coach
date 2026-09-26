import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  private async verifyWorkspaceOwnership(workspaceId: number, userId: number) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, userId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
  }

  async create(
    workspaceId: number,
    userId: number,
    name: string,
    description?: string,
    tags?: string,
  ) {
    await this.verifyWorkspaceOwnership(workspaceId, userId);
    return this.prisma.subject.create({
      data: { workspaceId, name, description, tags },
    });
  }

  async findAllForWorkSpace(workspaceId: number, userId: number) {
    await this.verifyWorkspaceOwnership(workspaceId, userId);
    return this.prisma.subject.findMany({ where: { workspaceId } });
  }
}
