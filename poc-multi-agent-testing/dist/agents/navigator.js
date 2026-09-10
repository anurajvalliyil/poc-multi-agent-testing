import { AgentType } from '../schemas/agentMessage.js';
export class NavigatorAgent {
    client;
    constructor(client) {
        this.client = client;
    }
    async execute(message) {
        const start = Date.now();
        const logs = [];
        const { action, target, value, url } = message.payload;
        try {
            logs.push(`Navigator received action: ${action}`);
            let resultData = {};
            switch (action) {
                case 'navigate':
                    if (!url)
                        throw new Error("URL is required for navigate action");
                    logs.push(`Navigating to ${url}`);
                    await this.client.navigate(url);
                    break;
                case 'click':
                    if (!target)
                        throw new Error("Target selector is required for click action");
                    logs.push(`Clicking element: ${target}`);
                    await this.client.click(target);
                    break;
                case 'type':
                    if (!target || !value)
                        throw new Error("Target and value are required for type action");
                    logs.push(`Typing into ${target}: ${value}`);
                    await this.client.type(target, value);
                    break;
                case 'wait':
                    logs.push(`Waiting for 2000ms`);
                    await new Promise(r => setTimeout(r, 2000));
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            return {
                agentType: AgentType.NAVIGATOR,
                success: true,
                data: resultData,
                durationMs: Date.now() - start,
                logs
            };
        }
        catch (error) {
            logs.push(`Navigation failed: ${error.message}`);
            return {
                agentType: AgentType.NAVIGATOR,
                success: false,
                error: error.message,
                durationMs: Date.now() - start,
                logs
            };
        }
    }
}
