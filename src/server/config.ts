import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  geminiApiKey?: string;
  appUrl?: string;
  apiVersion: string;
  maxPayloadSize: string;
}

export const config: ServerConfig = {
  port: 3000,
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  apiVersion: '2.4.0',
  maxPayloadSize: '10mb',
};
