import { AgentType } from '../schemas/agentMessage.js';
import { getTestData } from '../fixtures/testData.js';
export class DataAgent {
    async execute(message) {
        const start = Date.now();
        const logs = [];
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
        }
        catch (error) {
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
