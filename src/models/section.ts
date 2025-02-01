import { model, Schema } from 'mongoose';
import { z } from 'zod';

export interface ISection {
  title: string;
  description?: string;
  order: number;
}

const sectionSchema = new Schema<ISection>(
  {
    title: {
      type: String,
      minlength: 1,
      maxlength: 255,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      minlength: 1,
      maxlength: 500,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      unique: true,
    },
  },
  { timestamps: true },
);

const Section = model('Section', sectionSchema);

function validateSection(section: ISection) {
  const schema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    order: z.number().min(1),
  });

  return schema.safeParse(section);
}

export { Section, validateSection };
