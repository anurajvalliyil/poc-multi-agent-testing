import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
export class PlaywrightClient {
    client;
    transport;
    constructor() {
        this.transport = new StdioClientTransport({
            command: "npx",
            args: ["-y", "@playwright/mcp@latest"]
        });
        this.client = new Client({ name: "poc-orchestrator", version: "1.0.0" }, { capabilities: {} });
    }
    async connect() {
        await this.client.connect(this.transport);
        console.log("[PlaywrightClient] Connected to Playwright MCP via stdio");
    }
    async disconnect() {
        await this.transport.close();
        console.log("[PlaywrightClient] Disconnected from Playwright MCP");
    }
    async callTool(name, args) {
        try {
            const result = await this.client.callTool({ name, arguments: args });
            if (result.isError) {
                throw new Error(`Tool returned error: ${result.content?.[0]?.text || 'Unknown error'}`);
            }
            return result;
        }
        catch (error) {
            console.error(`[PlaywrightClient] Error calling tool ${name}:`, error);
            throw error;
        }
    }
    async navigate(url) {
        return this.callTool("browser_navigate", { url });
    }
    async click(selector) {
        return this.callTool("browser_click", { target: selector });
    }
    async type(selector, text) {
        return this.callTool("browser_type", { target: selector, text: text });
    }
    async snapshot(target) {
        const args = {};
        if (target)
            args.target = target;
        return this.callTool("browser_snapshot", args);
    }
}
