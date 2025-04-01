interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens: number;
  input_tokens_details?: {
    cached_tokens: number;
  };
  output_tokens_details?: {
    reasoning_tokens: number;
  };
}

interface CostTracking {
  model: string;
  endpoint: string;
  tokenUsage: TokenUsage | undefined;
  cost: number;
  timestamp: Date;
}

// OpenAI pricing per 1M tokens (as of April 2024)
const TOKEN_PRICES: Record<string, { input: number; output: number; cached_input?: number }> = {
  // GPT-4.5
  'gpt-4.5-preview': {
    input: 75.00,
    cached_input: 37.50,
    output: 150.00
  },
  'gpt-4.5-preview-2025-02-27': {
    input: 75.00,
    cached_input: 37.50,
    output: 150.00
  },
  // GPT-4 Variants
  'gpt-4o': {
    input: 2.50,
    cached_input: 1.25,
    output: 10.00
  },
  'gpt-4o-2024-08-06': {
    input: 2.50,
    cached_input: 1.25,
    output: 10.00
  },
  'gpt-4o-mini': {
    input: 0.15,
    cached_input: 0.075,
    output: 0.60
  },
  'gpt-4o-mini-2024-07-18': {
    input: 0.15,
    cached_input: 0.075,
    output: 0.60
  },
  // Legacy GPT-4
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00
  },
  'gpt-4-turbo-2024-04-09': {
    input: 10.00,
    output: 30.00
  },
  'gpt-4': {
    input: 30.00,
    output: 60.00
  },
  'gpt-4-0613': {
    input: 30.00,
    output: 60.00
  },
  'gpt-4-32k': {
    input: 60.00,
    output: 120.00
  },
  // GPT-3.5
  'gpt-3.5-turbo': {
    input: 0.50,
    output: 1.50
  },
  'gpt-3.5-turbo-0125': {
    input: 0.50,
    output: 1.50
  },
  'gpt-3.5-turbo-16k-0613': {
    input: 3.00,
    output: 4.00
  },
  'gpt-3.5-turbo-instruct': {
    input: 1.50,
    output: 2.00
  }
};

// Image model pricing
const IMAGE_PRICES: Record<string, Record<string, number>> = {
  'dall-e-3-standard': {
    '1024x1024': 0.04,
    '1024x1792': 0.08
  },
  'dall-e-3-hd': {
    '1024x1024': 0.08,
    '1024x1792': 0.12
  },
  'dall-e-2': {
    '1024x1024': 0.02,
    '512x512': 0.018,
    '256x256': 0.016
  }
};

// Audio model pricing per minute
const AUDIO_PRICES: Record<string, { transcription?: number; generation?: number }> = {
  'whisper': {
    transcription: 0.006  // per minute
  },
  'tts': {
    generation: 0.015  // per 1M characters
  },
  'tts-hd': {
    generation: 0.030  // per 1M characters
  },
  'gpt-4o-transcribe': {
    transcription: 0.006  // per minute
  },
  'gpt-4o-mini-transcribe': {
    transcription: 0.003  // per minute
  },
  'gpt-4o-mini-tts': {
    generation: 0.015  // per minute
  }
};

export function calculateAICost(
  model: string,
  endpoint: string,
  tokenUsage?: TokenUsage,
  imageSize?: string,
  audioDuration?: number,
  characterCount?: number
): CostTracking {
  let calculatedCost = 0;

  // Validate inputs
  if (audioDuration !== undefined && audioDuration < 0) {
    throw new Error('Audio duration cannot be negative');
  }
  if (characterCount !== undefined && characterCount < 0) {
    throw new Error('Character count cannot be negative');
  }
  if (tokenUsage) {
    const { input_tokens, output_tokens, prompt_tokens, completion_tokens, total_tokens } = tokenUsage;
    const allTokens = [input_tokens, output_tokens, prompt_tokens, completion_tokens, total_tokens].filter(t => t !== undefined);
    if (allTokens.some(tokens => tokens < 0)) {
      throw new Error('Token counts cannot be negative');
    }
  }

  // Calculate cost based on endpoint type
  if (endpoint.includes('/chat/completions') || endpoint.includes('/completions') || endpoint.includes('/responses')) {
    if (!TOKEN_PRICES[model]) {
      throw new Error(`Unknown model for text completion: ${model}`);
    }
    if (tokenUsage) {
      const prices = TOKEN_PRICES[model];
      const inputTokens = tokenUsage.input_tokens || tokenUsage.prompt_tokens || 0;
      const outputTokens = tokenUsage.output_tokens || tokenUsage.completion_tokens || 0;
      const cachedTokens = tokenUsage.input_tokens_details?.cached_tokens || 0;
      
      // Calculate input cost considering cached tokens
      const regularInputCost = ((inputTokens - cachedTokens) / 1000000) * prices.input;
      const cachedInputCost = (prices.cached_input || 0) * (cachedTokens / 1000000);
      const outputCost = (outputTokens / 1000000) * prices.output;
      
      calculatedCost = regularInputCost + cachedInputCost + outputCost;
    }
  } 
  else if (endpoint.includes('/images/generations')) {
    const modelType = model.includes('hd') ? 'dall-e-3-hd' : 'dall-e-3-standard';
    if (!IMAGE_PRICES[modelType]) {
      throw new Error(`Unknown image model type: ${modelType}`);
    }
    if (!imageSize || !IMAGE_PRICES[modelType][imageSize]) {
      throw new Error(`Invalid image size for model ${modelType}: ${imageSize}`);
    }
    calculatedCost = IMAGE_PRICES[modelType][imageSize];
  }
  else if (endpoint.includes('/audio/transcriptions') || endpoint.includes('/audio/translations')) {
    if (!AUDIO_PRICES[model]) {
      throw new Error(`Unknown transcription model: ${model}`);
    }
    const transcriptionCost = AUDIO_PRICES[model].transcription;
    if (transcriptionCost === undefined) {
      throw new Error(`Model ${model} does not support transcription`);
    }
    if (audioDuration) {
      calculatedCost = (audioDuration / 60) * transcriptionCost;
    }
  }
  else if (endpoint.includes('/audio/speech')) {
    if (!AUDIO_PRICES[model]) {
      throw new Error(`Unknown speech generation model: ${model}`);
    }
    const generationCost = AUDIO_PRICES[model].generation;
    if (generationCost === undefined) {
      throw new Error(`Model ${model} does not support speech generation`);
    }
    if (characterCount) {
      calculatedCost = (characterCount / 1000000) * generationCost;
    }
  }
  else {
    throw new Error(`Unknown endpoint type: ${endpoint}`);
  }

  return {
    model,
    endpoint,
    tokenUsage,
    cost: calculatedCost,
    timestamp: new Date()
  };
}

// Helper function to format cost for display
export function formatCost(cost: number): string {
  return `$${cost.toFixed(6)}`; // Increased precision to show smaller costs
}