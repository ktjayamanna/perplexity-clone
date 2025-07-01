// Environment configuration and validation

export interface AppConfig {
  // Search API Configuration
  googleSearch: {
    apiKey: string;
    engineId: string;
  };
  
  // AI API Configuration
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  
  // Optional: Alternative APIs
  anthropic?: {
    apiKey: string;
  };
  
  bing?: {
    apiKey: string;
  };
  
  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  // Search Configuration
  search: {
    maxResults: number;
    maxQueryLength: number;
    timeoutMs: number;
  };
}

// Default configuration values
const DEFAULT_CONFIG = {
  openai: {
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  search: {
    maxResults: 8,
    maxQueryLength: 500,
    timeoutMs: 10 * 1000, // 10 seconds
  },
};

// Environment variable validation
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

function getNumericEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

function getFloatEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
}

// Load and validate configuration
export function loadConfig(): AppConfig {
  try {
    const config: AppConfig = {
      googleSearch: {
        apiKey: getRequiredEnvVar('GOOGLE_SEARCH_API_KEY'),
        engineId: getRequiredEnvVar('GOOGLE_SEARCH_ENGINE_ID'),
      },
      
      openai: {
        apiKey: getRequiredEnvVar('OPENAI_API_KEY'),
        model: getOptionalEnvVar('AI_MODEL', DEFAULT_CONFIG.openai.model)!,
        maxTokens: getNumericEnvVar('AI_MAX_TOKENS', DEFAULT_CONFIG.openai.maxTokens),
        temperature: getFloatEnvVar('AI_TEMPERATURE', DEFAULT_CONFIG.openai.temperature),
      },
      
      rateLimit: {
        windowMs: getNumericEnvVar('RATE_LIMIT_WINDOW_MS', DEFAULT_CONFIG.rateLimit.windowMs),
        maxRequests: getNumericEnvVar('RATE_LIMIT_MAX_REQUESTS', DEFAULT_CONFIG.rateLimit.maxRequests),
      },
      
      search: {
        maxResults: getNumericEnvVar('MAX_SEARCH_RESULTS', DEFAULT_CONFIG.search.maxResults),
        maxQueryLength: getNumericEnvVar('MAX_QUERY_LENGTH', DEFAULT_CONFIG.search.maxQueryLength),
        timeoutMs: getNumericEnvVar('SEARCH_TIMEOUT_MS', DEFAULT_CONFIG.search.timeoutMs),
      },
    };
    
    // Optional APIs
    const anthropicKey = getOptionalEnvVar('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      config.anthropic = { apiKey: anthropicKey };
    }
    
    const bingKey = getOptionalEnvVar('BING_SEARCH_API_KEY');
    if (bingKey) {
      config.bing = { apiKey: bingKey };
    }
    
    // Validate configuration values
    validateConfig(config);
    
    return config;
  } catch (error) {
    console.error('Configuration error:', error);
    throw error;
  }
}

// Configuration validation
function validateConfig(config: AppConfig): void {
  // Validate OpenAI temperature
  if (config.openai.temperature < 0 || config.openai.temperature > 1) {
    throw new Error('AI_TEMPERATURE must be between 0.0 and 1.0');
  }
  
  // Validate rate limiting
  if (config.rateLimit.windowMs <= 0) {
    throw new Error('RATE_LIMIT_WINDOW_MS must be positive');
  }
  
  if (config.rateLimit.maxRequests <= 0) {
    throw new Error('RATE_LIMIT_MAX_REQUESTS must be positive');
  }
  
  // Validate search configuration
  if (config.search.maxResults <= 0 || config.search.maxResults > 20) {
    throw new Error('MAX_SEARCH_RESULTS must be between 1 and 20');
  }
  
  if (config.search.maxQueryLength <= 0 || config.search.maxQueryLength > 1000) {
    throw new Error('MAX_QUERY_LENGTH must be between 1 and 1000');
  }
  
  if (config.search.timeoutMs <= 0) {
    throw new Error('SEARCH_TIMEOUT_MS must be positive');
  }
}

// Singleton configuration instance
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

// Reset configuration (useful for testing)
export function resetConfig(): void {
  configInstance = null;
}
