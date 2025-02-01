import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

export interface IQuestion {
  sectionId: Schema.Types.ObjectId;
  text: string;
  order: number;
}

const questionSchema = new Schema<IQuestion>(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'section',
    },
    text: {
      type: String,
      minlength: 1,
      maxlength: 1000,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true },
);

const Question = model('Question', questionSchema);

function validateQuestion(question: IQuestion) {
  const schema = z.object({
    sectionId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    text: z.string().min(1).max(1000),
    order: z.number().min(1),
  });

  return schema.safeParse(question);
}

export { Question, validateQuestion };
