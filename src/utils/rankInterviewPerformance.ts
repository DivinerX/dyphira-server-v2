import { openai } from '@/config/openai';

export async function rankInterviewPerformance(transcript: string) {
  return await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Given the following interview transcript, ${transcript || 'empty transcript'}, rank the person on a scale of 0-100 in several categories. The categories are confidence, knowledgeability, determination, evangelism, work ethic, vision, interests, past work quality, intelligence, personality, horsepower, hustle, curiosity, focus, and ferocity. 0 is a low score while 100 is a high score. If transcript does not contain any of the categories or the person does not mention anything about the category, you should give a score of 0 in that category so result must be a valid JSON and fill all categories. Reply with only the categories and their corresponding scores in JSON format, structured as follows:
          [
            {
              "category": "confidence",
              "score": 75
            },
            {
              "category": "knowledgeability",
              "score": 90
            },
            // Continue for all categories...
          ]
        `,
      },
    ],
  });
}
