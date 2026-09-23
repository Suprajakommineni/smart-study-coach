import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import Groq from 'groq-sdk';

@Injectable()
export class SourceService {
  private groq: Groq;

  constructor(private prisma: PrismaService) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async create(moduleId: number, text: string) {
    return this.prisma.source.create({
      data: { moduleId, text, status: 'draft' },
    });
  }

  async findAllForModule(moduleId: number) {
    return this.prisma.source.findMany({ where: { moduleId } });
  }

  async process(sourceId: number) {
    const source = await this.prisma.source.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error('Source not found');

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
  {
    "title": "...",
    "definition": "...",
    "facts": ["...", "...", "..."]
  }
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

      const aiRunId = 'groq-run-' + Date.now();

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
              aiRunId,
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