import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubjectService {
    constructor(private prisma: PrismaService) {}

    async create(workspaceId: number, name: string, description?: string, tags?: string) {
        return this.prisma.subject.create({
            data: { workspaceId, name, description, tags}
        })
    }

    async findAllForWorkSpace(workspaceId: number) {
        return this.prisma.subject.findMany({ where: { workspaceId },});
    }
}
