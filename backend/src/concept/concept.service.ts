import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ConceptService {
  constructor(private prisma: PrismaService) {}

  async findAllConcepts(sourceId: number) {
    const concepts = await this.prisma.concept.findMany({
      where: { sourceId },
    });
    return concepts;
  }

  async accept(conceptId: number) {
    return this.prisma.concept.update({
      where: { id: conceptId },
      data: { status: 'accepted' },
    });
  }

  async reject(conceptId: number) {
    return this.prisma.concept.update({
      where: { id: conceptId },
      data: { status: 'rejected' },
    });
  }

  async edit(
    conceptId: number,
    title: string,
    definition: string,
    facts: string[],
  ) {
    return this.prisma.concept.update({
      where: { id: conceptId },
      data: {
        title,
        definition,
        facts: JSON.stringify(facts),
        status: 'edited',
      },
    });
  }

  async merge(keepId: number, mergeId: number) {
    const existing = await this.prisma.concept.findUnique({
      where: { id: keepId },
    });
    const merging = await this.prisma.concept.findUnique({
      where: { id: mergeId },
    });
    if (!existing || !merging) {
      throw new Error('One or both concepts not found');
    }
    const existingFacts = JSON.parse(existing.facts); 
    const mergingFacts = JSON.parse(merging.facts); 
    const combinedFacts = [...existingFacts, ...mergingFacts]; 
    const finalConcept = await this.prisma.concept.update({
      where: { id: keepId },
      data: {
        facts: JSON.stringify(combinedFacts),
        status: 'edited',
      },
    });
    await this.prisma.concept.update({
      where: { id: mergeId },
      data: { status: 'merged' },
    });

    return finalConcept;
  }
}
