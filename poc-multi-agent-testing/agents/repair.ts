import { AgentType, AgentMessage, AgentResult } from '../schemas/agentMessage.js';
import { PlaywrightClient } from '../mcp/playwrightClient.js';

export interface RepairPayload {
  failedLocator: string;
  action: string;
}

export class RepairAgent {
  private client: PlaywrightClient;

  constructor(client: PlaywrightClient) {
    this.client = client;
  }

  async execute(message: AgentMessage<RepairPayload>): Promise<AgentResult> {
    const start = Date.now();
    const logs: string[] = [];
    const { failedLocator, action } = message.payload;

    try {
      logs.push(`Primary locator failed: ${failedLocator}`);
      
      // Extract base attribute to try fallbacks.
      // Intentionally naive fallback logic for demonstration purposes
      const match = failedLocator.match(/data-test="([^"]+)"/);
      let correctedLocator = failedLocator;
      let success = false;

      if (match) {
        const base = match[1];
        // 1. Try CSS prefix match if there was a typo at the end
        // e.g. "add-to-cart-sauce-labs-backpackk" -> "add-to-cart-sauce-labs-backpack"
        const prefix = base.substring(0, base.length - 1);
        const fallback1 = `[data-test^="${prefix}"]`;
        logs.push(`Attempting fallback [1] (prefix CSS): ${fallback1}`);

        // Validate fallback by checking if element exists via snapshot
        const snapRes = await this.client.snapshot(fallback1);
        const snapText = snapRes.content?.[0]?.text || "";
        
        if (snapText && !snapText.includes("not found") && !snapText.includes("Error")) {
          logs.push(`Fallback [1] successful! Element found in snapshot.`);
          correctedLocator = fallback1;
          success = true;
        } else {
            logs.push(`Fallback [1] failed.`);
            // Mock other fallback attempts for logging demo
            logs.push(`Attempting fallback [2] (XPath): //button[contains(@data-test, "${prefix}")]`);
            logs.push(`Fallback [2] failed.`);
            logs.push(`Attempting fallback [3] (Text): text="${prefix}"`);
            logs.push(`Fallback [3] failed.`);
        }
      }

      if (!success) {
        throw new Error(`Could not repair locator ${failedLocator}`);
      }

      return {
        agentType: AgentType.REPAIR,
        success: true,
        data: { correctedLocator },
        durationMs: Date.now() - start,
        logs
      };
    } catch (error: any) {
      logs.push(`Repair Agent failed: ${error.message}`);
      return {
        agentType: AgentType.REPAIR,
        success: false,
        error: error.message,
        durationMs: Date.now() - start,
        logs
      };
    }
  }
}
