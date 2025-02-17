import { openai } from '@/config/openai';

export async function rankInterviewPerformance(transcript: string) {
  return await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Given the following interview transcript, ${transcript || 'empty transcript'}, rank the person on a scale of 0-100 in several categories. The categories are IQ, evangelism, determination, effectiveness, and vision. 0 is a low score while 100 is a high score. If transcript does not contain any of the categories or the person does not mention anything about the category, you should give a score of 0 in that category so result must be a valid JSON and fill all categories. Reply with only the categories and their corresponding scores in JSON format, structured as follows:
          [
            {
              "category": "IQ",
              "score": 75
            },
            {
              "category": "evangelism",
              "score": 90
            },
            // Continue for all categories...
          ]
        `,
      },
    ],
  });
}
