import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import Groq from 'groq-sdk';

@Injectable()
export class SourceService {
  private groq: Groq;

  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  private async verifyModuleOwnership(moduleId: number, userId: number) {
    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, subject: { workspace: { userId } } },
    });
    if (!module) throw new NotFoundException('Module not found');
  }

  private async verifySourceOwnership(sourceId: number, userId: number) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, module: { subject: { workspace: { userId } } } },
    });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async create(moduleId: number, userId: number, text: string) {
    await this.verifyModuleOwnership(moduleId, userId);

    const source = await this.prisma.source.create({
      data: { moduleId, text, status: 'draft', version: 1 },
    });

    await this.prisma.sourceVersion.create({
      data: { sourceId: source.id, version: 1, text },
    });

    return source;
  }

  async update(sourceId: number, userId: number, text: string) {
    const source = await this.verifySourceOwnership(sourceId, userId);

    const beforeSource = source;
    const newVersion = source.version + 1;

    const updatedSource = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.source.update({
        where: { id: sourceId },
        data: { text, version: newVersion, status: 'draft' },
      });

      await tx.sourceVersion.create({
        data: { sourceId, version: newVersion, text },
      });

      await tx.concept.updateMany({
        where: {
          sourceId,
          sourceVersion: { lt: newVersion },
          status: 'accepted',
        },
        data: { status: 'outdated' },
      });

      return updated;
    });

    await this.auditLogService.createLog(
      userId,
      'edit',
      'Source',
      sourceId,
      beforeSource,
      updatedSource,
    );

    return updatedSource;
  }

  async findAllForModule(moduleId: number, userId: number) {
    await this.verifyModuleOwnership(moduleId, userId);
    return this.prisma.source.findMany({
      where: { moduleId },
      include: { versions: true },
    });
  }

  async process(sourceId: number, userId: number) {
    const source = await this.verifySourceOwnership(sourceId, userId);

    try {
      const prompt = `
You are helping a student organize study notes into concepts.
Read the text below and extract 2-4 key concepts.

For each concept, give:
- title (short, a few words)
- definition (1-2 sentences, simple)
- facts (an array of 3-8 short bullet-point facts)

Respond ONLY with valid JSON, in this exact format, no other text:
[
  { "title": "...", "definition": "...", "facts": ["...", "...", "..."] }
]

Text to analyze:
"""
${source.text}
"""
      `;

      const completion = await this.groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = completion.choices[0]?.message?.content ?? '';
      const cleanedText = responseText.replace(/```json|```/g, '').trim();
      const aiConcepts = JSON.parse(cleanedText);

      const aiRun = await this.prisma.aiRun.create({
        data: {
          model: 'openai/gpt-oss-20b',
          promptVersion: 'concept-extraction-v1',
          input: prompt,
          output: cleanedText,
        },
      });

      const createdConcepts = await Promise.all(
        aiConcepts.map((c: any) =>
          this.prisma.concept.create({
            data: {
              sourceId: source.id,
              sourceVersion: source.version,
              title: c.title,
              definition: c.definition,
              facts: JSON.stringify(c.facts),
              snippet: source.text.slice(0, 100),
              aiRunId: aiRun.id,
              status: 'suggested',
            },
          }),
        ),
      );

      await this.prisma.source.update({
        where: { id: sourceId },
        data: { status: 'processed' },
      });

      return createdConcepts;
    } catch (error) {
      await this.prisma.source.update({
        where: { id: sourceId },
        data: { status: 'needs review' },
      });
      throw error;
    }
  }
}
