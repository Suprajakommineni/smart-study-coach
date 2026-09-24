import { Injectable } from '@nestjs/common';
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

  async findAllConcepts(sourceId: number) {
    const concepts = await this.prisma.concept.findMany({
      where: { sourceId },
    });

    return concepts;
  }

  async accept(conceptId: number, userId: number) {
    const beforeConcept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!beforeConcept) {
      throw new Error('Concept not found');
    }

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
    const beforeConcept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!beforeConcept) {
      throw new Error('Concept not found');
    }

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
    const beforeConcept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!beforeConcept) {
      throw new Error('Concept not found');
    }

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

  async merge(
  keepId: number,
  mergeId: number,
  userId: number,
) {
  const existing = await this.prisma.concept.findUnique({
    where: { id: keepId },
  });

  const merging = await this.prisma.concept.findUnique({
    where: { id: mergeId },
  });

  if (!existing || !merging) {
    throw new Error('One or both concepts not found');
  }

  if (keepId === mergeId) {
    throw new Error('A concept cannot be merged with itself');
  }

  const existingFacts = JSON.parse(existing.facts);
  const mergingFacts = JSON.parse(merging.facts);

  const combinedFacts = [
    ...existingFacts,
    ...mergingFacts,
  ];

  // Find questions linked to the concept being merged
  const questions = await this.prisma.questionConcept.findMany({
    where: {
      conceptId: mergeId,
    },
  });

  // Move those questions to the concept we are keeping
  for (const question of questions) {
    await this.prisma.questionConcept.upsert({
      where: {
        questionId_conceptId: {
          questionId: question.questionId,
          conceptId: keepId,
        },
      },
      update: {},
      create: {
        questionId: question.questionId,
        conceptId: keepId,
      },
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

  // Update the concept we are keeping
  const finalConcept = await this.prisma.concept.update({
    where: { id: keepId },
    data: {
      facts: JSON.stringify(combinedFacts),
      status: 'edited',
    },
  });

  // Mark the other concept as merged
  const mergedConcept = await this.prisma.concept.update({
    where: { id: mergeId },
    data: {
      status: 'merged',
    },
  });

  // Remove the old mastery record for the merged concept.
  // Historical attempts are NOT deleted.
  await this.prisma.mastery.deleteMany({
    where: {
      conceptId: mergeId,
    },
  });

  // Create mastery for the kept concept if it doesn't exist.
  const existingMastery = await this.prisma.mastery.findUnique({
    where: {
      conceptId: keepId,
    },
  });

  if (!existingMastery) {
    await this.prisma.mastery.create({
      data: {
        conceptId: keepId,
        score: 0,
        bucket: 'New',
      },
    });
  }

  // Recalculate mastery using all historical attempts
  // now linked to the kept concept.
  await this.masteryService.recalculateMastery(keepId);

  // Audit the merge
  await this.auditLogService.createLog(
    userId,
    'merge',
    'Concept',
    keepId,
    {
      keptConcept: existing,
      mergedConcept: merging,
    },
    {
      finalConcept,
      mergedConcept,
    },
  );

  return finalConcept;
}
}