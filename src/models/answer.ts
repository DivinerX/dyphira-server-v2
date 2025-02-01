import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

export interface IAnswer {
  assessmentId: Types.ObjectId;
  userId: Types.ObjectId;
  sectionId: Types.ObjectId;
  questionId: Types.ObjectId;
  text: string;
  videoStartTimestamp: number;
  videoEndTimestamp: number;
}

const answerSchema = new Schema<IAnswer>(
  {
    assessmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Assessment',
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Section',
    },
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Question',
    },
    text: [
      {
        type: String,
        minlength: 1,
        maxlength: 5000,
        trim: true,
      },
    ],
    // in milliseconds
    videoStartTimestamp: {
      type: Number,
      min: 0,
    },
    videoEndTimestamp: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true },
);

const Answer = model('Answer', answerSchema);

function validateCreateAnswer(answer: IAnswer) {
  const schema = z.object({
    assessmentId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    sectionId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    userId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    questionId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    videoStartTimestamp: z.number(),
  });

  return schema.safeParse(answer);
}

function validateUpdateAnswer(answer: IAnswer) {
  const schema = z.object({
    text: z.string().min(1).max(1000).trim().optional(),
    videoEndTimestamp: z.number().optional(),
  });

  return schema.safeParse(answer);
}

export { Answer, validateCreateAnswer, validateUpdateAnswer };
