import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModuleService {
    constructor( private prisma: PrismaService) {}
  async create(subjectId: number, name: string, description?: string, tags?: string) {
      return this.prisma.module.create({
        data: {subjectId, name, description, tags}
  })
  }
  async findAllForSubject(subjectId: number) {
    return this.prisma.module.findMany({ where: {subjectId}})
  }

}
