import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  private async verifySubjectOwnership(subjectId: number, userId: number) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, workspace: { userId } },
    });
    if (!subject) throw new NotFoundException('Subject not found');
  }

  async create(
    subjectId: number,
    userId: number,
    name: string,
    description?: string,
    tags?: string,
  ) {
    await this.verifySubjectOwnership(subjectId, userId);
    return this.prisma.module.create({
      data: { subjectId, name, description, tags },
    });
  }

  async findAllForSubject(subjectId: number, userId: number) {
    await this.verifySubjectOwnership(subjectId, userId);
    return this.prisma.module.findMany({ where: { subjectId } });
  }
}
