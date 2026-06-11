// Unified AI Provider interface (Wave 3)
export interface GenerateOptions {
  system?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  raw?: any;
}

export interface AIProvider {
  name: string;
  generate(model: string, opts: GenerateOptions): Promise<GenerateResult>;
}
