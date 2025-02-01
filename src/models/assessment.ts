import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

const ASSESSMENT_STATUS = [
  'in-progress',
  'completed',
  'timeout',
  'abandoned',
] as const;

interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssessment extends Timestamps {
  userId: Types.ObjectId;
  startedAt: Date;
  completedAt: Date;
  status: (typeof ASSESSMENT_STATUS)[number];
  videoUrl: string;
  audioUrl: string;
  transcript: string;
  ranking: string;
  score: number;
}

const assessmentSchema = new Schema<IAssessment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      validate: {
        validator: function (value) {
          return value > this.startedAt;
        },
        message: 'completedAt should be greater than startedAt',
      },
    },
    status: {
      type: String,
      enum: ASSESSMENT_STATUS,
      required: true,
      default: 'in-progress',
    },
    videoUrl: {
      type: String,
    },
    audioUrl: {
      type: String,
    },
    transcript: {
      type: String,
    },
    ranking: {
      type: String,
    },
    score: {
      type: Number,
    },
  },
  { timestamps: true },
);

const Assessment = model('Assessment', assessmentSchema);

function validateAssessment(assessment: IAssessment) {
  const schema = z.object({
    userId: z.string().refine((val) => Types.ObjectId.isValid(val)),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    status: z.enum(ASSESSMENT_STATUS).optional(),
    videoUrl: z.string().url().optional(),
  });

  return schema.safeParse(assessment);
}

export { Assessment, validateAssessment };
