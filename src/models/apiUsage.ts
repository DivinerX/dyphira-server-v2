import { Schema, model } from 'mongoose';

// All available AI models
export const AI_MODELS = [
  // GPT-4.5
  'gpt-4.5-preview',
  'gpt-4.5-preview-2025-02-27',

  // GPT-4 Variants
  'gpt-4o',
  'gpt-4o-2024-08-06',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',

  // Legacy GPT-4
  'gpt-4-turbo',
  'gpt-4-turbo-2024-04-09',
  'gpt-4',
  'gpt-4-0613',
  'gpt-4-32k',

  // GPT-3.5
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-0125',
  'gpt-3.5-turbo-16k-0613',
  'gpt-3.5-turbo-instruct',

  // Image Models
  'dall-e-3-standard',
  'dall-e-3-hd',
  'dall-e-2',

  // Audio Models
  'whisper',
  'tts',
  'tts-hd',
  'gpt-4o-transcribe',
  'gpt-4o-mini-transcribe',
  'gpt-4o-mini-tts'
] as const;

export type AIModel = typeof AI_MODELS[number];

export interface IAPIUsage {
  user: string;
  provider: 'openai' | 'runpod' | 'fireworks'
  model: AIModel;
  tokens: number;
  costs: number;
  endpoint: string;
}

const APIUsageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: Schema.Types.String, required: true, enum: ['openai', 'runpod', 'fireworks'] },
  model: { type: String, required: true, enum: AI_MODELS },
  tokens: {
    type: Schema.Types.Number,
    default: 0,
    validate: {
      validator: (value: number) => value >= 0,
      message: 'Tokens must be a non-negative number'
    }
  },
  costs: {
    type: Schema.Types.Number,
    default: 0,
    validate: {
      validator: (value: number) => value >= 0,
      message: 'Costs must be a non-negative number'
    }
  },
  endpoint: { type: Schema.Types.String, required: true }
}, {
  timestamps: true
});

// Add indexes for common query fields
APIUsageSchema.index({ user: 1, createdAt: -1 });
APIUsageSchema.index({ model: 1, createdAt: -1 });
APIUsageSchema.index({ provider: 1, createdAt: -1 });

const APIUsage = model<IAPIUsage>('APIUsage', APIUsageSchema);

export default APIUsage;
