import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { MasteryService } from '../mastery/mastery.service.js';

@Injectable()
export class ConceptService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private masteryService: MasteryService,
  ) {}

  private async verifySourceOwnership(sourceId: number, userId: number) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, module: { subject: { workspace: { userId } } } },
    });
    if (!source) throw new NotFoundException('Source not found');
  }

  private async getOwnedConcept(conceptId: number, userId: number) {
    const concept = await this.prisma.concept.findFirst({
      where: {
        id: conceptId,
        source: { module: { subject: { workspace: { userId } } } },
      },
    });
    if (!concept) throw new NotFoundException('Concept not found');
    return concept;
  }

  async findAllConcepts(sourceId: number, userId: number) {
    await this.verifySourceOwnership(sourceId, userId);
    return this.prisma.concept.findMany({ where: { sourceId } });
  }

  async accept(conceptId: number, userId: number) {
    const beforeConcept = await this.getOwnedConcept(conceptId, userId);
    const updatedConcept = await this.prisma.concept.update({
      where: { id: conceptId },
      data: { status: 'accepted' },
    });
    await this.auditLogService.createLog(
      userId,
      'accept',
      'Concept',
      conceptId,
      beforeConcept,
      updatedConcept,
    );
    return updatedConcept;
  }

  async reject(conceptId: number, userId: number) {
    const beforeConcept = await this.getOwnedConcept(conceptId, userId);
    const updatedConcept = await this.prisma.concept.update({
      where: { id: conceptId },
      data: { status: 'rejected' },
    });
    await this.auditLogService.createLog(
      userId,
      'reject',
      'Concept',
      conceptId,
      beforeConcept,
      updatedConcept,
    );
    return updatedConcept;
  }

  async edit(
    conceptId: number,
    userId: number,
    title: string,
    definition: string,
    facts: string[],
  ) {
    const beforeConcept = await this.getOwnedConcept(conceptId, userId);
    const updatedConcept = await this.prisma.concept.update({
      where: { id: conceptId },
      data: {
        title,
        definition,
        facts: JSON.stringify(facts),
        status: 'edited',
      },
    });
    await this.auditLogService.createLog(
      userId,
      'edit',
      'Concept',
      conceptId,
      beforeConcept,
      updatedConcept,
    );
    return updatedConcept;
  }

  async merge(keepId: number, mergeId: number, userId: number) {
    if (keepId === mergeId)
      throw new Error('A concept cannot be merged with itself');

    const existing = await this.getOwnedConcept(keepId, userId);
    const merging = await this.getOwnedConcept(mergeId, userId);

    const existingFacts = JSON.parse(existing.facts);
    const mergingFacts = JSON.parse(merging.facts);
    const combinedFacts = [...existingFacts, ...mergingFacts];

    const questions = await this.prisma.questionConcept.findMany({
      where: { conceptId: mergeId },
    });

    for (const question of questions) {
      await this.prisma.questionConcept.upsert({
        where: {
          questionId_conceptId: {
            questionId: question.questionId,
            conceptId: keepId,
          },
        },
        update: {},
        create: { questionId: question.questionId, conceptId: keepId },
      });
      await this.prisma.questionConcept.delete({
        where: {
          questionId_conceptId: {
            questionId: question.questionId,
            conceptId: mergeId,
          },
        },
      });
    }

    const finalConcept = await this.prisma.concept.update({
      where: { id: keepId },
      data: { facts: JSON.stringify(combinedFacts), status: 'edited' },
    });

    const mergedConcept = await this.prisma.concept.update({
      where: { id: mergeId },
      data: { status: 'merged' },
    });

    await this.prisma.mastery.deleteMany({ where: { conceptId: mergeId } });

    const existingMastery = await this.prisma.mastery.findUnique({
      where: { conceptId: keepId },
    });
    if (!existingMastery) {
      await this.prisma.mastery.create({
        data: { conceptId: keepId, score: 0, bucket: 'New' },
      });
    }

    await this.masteryService.recalculateMastery(keepId);

    await this.auditLogService.createLog(
      userId,
      'merge',
      'Concept',
      keepId,
      { keptConcept: existing, mergedConcept: merging },
      { finalConcept, mergedConcept },
    );

    return finalConcept;
  }
}
