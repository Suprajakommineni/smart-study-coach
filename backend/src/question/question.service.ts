import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import Groq from 'groq-sdk';

@Injectable()
export class QuestionService {
  private groq: Groq;

  constructor(private prisma: PrismaService) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generateQuestions(moduleId: number) {
    const acceptedConcepts = await this.prisma.concept.findMany({
      where: {
        status: 'accepted',
        source: { moduleId },
      },
    });

    if (acceptedConcepts.length === 0) {
      throw new Error('No accepted concepts found for this module');
    }

    const allNewQuestions = [];

    for (const concept of acceptedConcepts) {
      await this.prisma.question.deleteMany({
        where: {
          conceptId: concept.id,
          status: 'generated',
        },
      });

      const prompt = `
For the concept "${concept.title}: ${concept.definition}", generate 2 quiz questions:
- One multiple choice question with 4 options (as an array) and the correct answer
- One true/false question (choices should be ["True", "False"])

Respond ONLY with valid JSON, no other text, in this exact format:
[
  { "type": "mcq", "text": "...", "answer": "...", "choices": ["...", "...", "...", "..."], "difficulty": 2 },
  { "type": "true_false", "text": "...", "answer": "True", "choices": ["True", "False"], "difficulty": 1 }
]
      `;

      try {
        const completion = await this.groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'user', content: prompt }],
        });

        const responseText = completion.choices[0]?.message?.content ?? '';
        const cleanedText = responseText.replace(/```json|```/g, '').trim();
        const aiQuestions = JSON.parse(cleanedText);

        const createdQuestions = await Promise.all(
          aiQuestions.map((q: any) =>
            this.prisma.question.create({
              data: {
                conceptId: concept.id,
                type: q.type,
                text: q.text,
                answer: q.answer,
                choices: q.choices ? JSON.stringify(q.choices) : null,
                difficulty: q.difficulty ?? 2,
                status: 'generated',
              },
            }),
          ),
        );

        allNewQuestions.push(...createdQuestions);
      } catch (error) {
        // skip this concept's questions on failure, continue with others
        console.log(
          `Question generation failed for concept ${concept.id}`,
          error,
        );
      }
    }

    return allNewQuestions;
  }

  async findAllForModule(moduleId: number) {
    return this.prisma.question.findMany({
      where: {
        concept: {
          source: { moduleId },
        },
      },
    });
  }
}
