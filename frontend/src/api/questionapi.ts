import { apiRequest } from "./clientapi";

export async function createQuestions(
  moduleId: number,
) {
  return apiRequest(
    `modules/${moduleId}/questions/generate`,
    {
      method: "POST",
    },
  );
}

export async function fetchQuestions(
  moduleId: number,
) {
  return apiRequest(
    `modules/${moduleId}/questions`,
  );
}

export async function editQuestion(
  questionId: number,
  data: {
    text: string;
    answer: string;
    choices: string[] | null;
    difficulty: number;
    conceptIds: number[];
  },
) {
  return apiRequest(
    `questions/${questionId}/edit`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function approveQuestion(
  questionId: number,
) {
  return apiRequest(
    `questions/${questionId}/approve`,
    {
      method: "POST",
    },
  );
}

export async function retireQuestion(
  questionId: number,
) {
  return apiRequest(
    `questions/${questionId}/retire`,
    {
      method: "POST",
    },
  );
}