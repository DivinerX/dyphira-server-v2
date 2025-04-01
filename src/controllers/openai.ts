import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import env from '@/config/env';
import { calculateAICost, formatCost } from '@/utils/aiCostTracker';
import APIKey from '@/models/apikey';
import APIUsage, { AI_MODELS } from '@/models/apiUsage';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export const proxyOpenAI = async (req: Request, res: Response) => {
  try {
    // Get the full path from the request and remove the /openai/ prefix
    const fullPath = req.path.replace('/openai', '');
    const method = req.method;
    
    // Log the model being used from the request body
    if (req.body.model) {
      console.log(`Model being used: ${req.body.model}`);
    }

    // Construct headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': req.headers.authorization || `Bearer ${env.OPENAI_API_KEY}`,
    };

    // Remove host header to avoid conflicts
    delete headers.host;

    let response: AxiosResponse;
    if (req.files && Object.keys(req.files).length > 0) {
      // Handle file uploads
      const formData = new FormData();
      
      // Add files to form data
      Object.entries(req.files).forEach(([key, file]: [string, any]) => {
        formData.append(key, file.data, file.name);
      });

      // Add other fields from body
      Object.entries(req.body).forEach(([key, value]) => {
        if (key !== 'file' && key !== 'mask') {
          formData.append(key, value);
        }
      });

      response = await axios({
        method,
        url: `${OPENAI_BASE_URL}${fullPath}`,
        headers: {
          ...headers,
          ...formData.getHeaders(),
        },
        data: formData,
        timeout: 30000, // 30 second timeout
        maxContentLength: Infinity,
      });
    } else {
      // Handle regular JSON requests
      response = await axios({
        method,
        url: `${OPENAI_BASE_URL}${fullPath}`,
        headers,
        data: req.body,
        params: req.query,
        timeout: 30000, // 30 second timeout
        maxContentLength: Infinity,
      });
    }

    // Track AI usage and cost
    const model = req.body.model || 'unknown';
    const costTracking = calculateAICost(
      model,
      fullPath,
      response.data.usage,
      req.body.size, // for image generations
      req.body.file?.duration, // for audio transcription/translation
      req.body.input?.length // for text-to-speech
    );

    console.log('AI Usage Tracking:', {
      model: costTracking.model,
      endpoint: costTracking.endpoint,
      tokenUsage: costTracking.tokenUsage,
      estimatedCost: formatCost(costTracking.cost),
      timestamp: costTracking.timestamp
    });

    const key = req.headers.apikey;
    const apiKey = await APIKey.findOne({ key });
    if (!apiKey) {
      throw new Error('Invalid API key: No associated user found');
    }

    // Validate model against AI_MODELS enum
    if (!costTracking.model || !AI_MODELS.includes(costTracking.model as any)) {
      throw new Error(`Invalid model: ${costTracking.model}`);
    }

    await APIUsage.create({
      provider: 'openai',
      model: costTracking.model,
      endpoint: costTracking.endpoint,
      tokens: costTracking.tokenUsage?.total_tokens || 0, // Default to 0 if undefined
      costs: costTracking.cost,
      user: apiKey.user
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      path: req.path,
      method: req.method,
    });

    if (error.code === 'ECONNRESET') {
      res.status(503).json({
        error: 'Service temporarily unavailable. Please try again.',
        details: error.message,
      });
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      res.status(error.response.status).json({
        error: error.response.data,
        status: error.response.status,
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(504).json({
        error: 'No response received from OpenAI API',
        details: error.message,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
      });
    }
  }
};
