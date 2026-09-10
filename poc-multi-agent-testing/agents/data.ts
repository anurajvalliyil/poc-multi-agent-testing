import { AgentType, AgentMessage, AgentResult } from '../schemas/agentMessage.js';
import { getTestData } from '../fixtures/testData.js';

export interface DataPayload {
  context: string;
}

export class DataAgent {
  async execute(message: AgentMessage<DataPayload>): Promise<AgentResult> {
    const start = Date.now();
    const logs: string[] = [];
    const { context } = message.payload;

    try {
      logs.push(`DataAgent requesting data for context: ${context}`);
      const data = getTestData(context);
      logs.push(`Data generated successfully`);

      return {
        agentType: AgentType.DATA,
        success: true,
        data,
        durationMs: Date.now() - start,
        logs
      };
    } catch (error: any) {
      logs.push(`DataAgent error: ${error.message}`);
      return {
        agentType: AgentType.DATA,
        success: false,
        error: error.message,
        durationMs: Date.now() - start,
        logs
      };
    }
  }
}
