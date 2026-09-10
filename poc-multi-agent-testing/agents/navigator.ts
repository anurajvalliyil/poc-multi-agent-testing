import { AgentType, AgentMessage, AgentResult } from '../schemas/agentMessage.js';
import { PlaywrightClient } from '../mcp/playwrightClient.js';

export interface NavigatorPayload {
  action: 'navigate' | 'click' | 'type' | 'wait';
  target?: string;
  value?: string;
  url?: string;
}

export class NavigatorAgent {
  private client: PlaywrightClient;

  constructor(client: PlaywrightClient) {
    this.client = client;
  }

  async execute(message: AgentMessage<NavigatorPayload>): Promise<AgentResult> {
    const start = Date.now();
    const logs: string[] = [];
    const { action, target, value, url } = message.payload;

    try {
      logs.push(`Navigator received action: ${action}`);
      let resultData: any = {};

      switch (action) {
        case 'navigate':
          if (!url) throw new Error("URL is required for navigate action");
          logs.push(`Navigating to ${url}`);
          await this.client.navigate(url);
          break;
        case 'click':
          if (!target) throw new Error("Target selector is required for click action");
          logs.push(`Clicking element: ${target}`);
          await this.client.click(target);
          break;
        case 'type':
          if (!target || !value) throw new Error("Target and value are required for type action");
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
    } catch (error: any) {
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
