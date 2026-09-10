import { AgentType } from '../schemas/agentMessage.js';
export class AssertionAgent {
    client;
    constructor(client) {
        this.client = client;
    }
    async execute(message) {
        const start = Date.now();
        const logs = [];
        const { type, selector, expected } = message.payload;
        try {
            logs.push(`Assertion received type: ${type}`);
            let success = false;
            let actualValue = null;
            switch (type) {
                case 'element_visible':
                case 'text_contains':
                    if (!expected && !selector)
                        throw new Error("Target or expected required");
                    logs.push(`Taking snapshot to verify: ${selector || expected}`);
                    // For text_contains, get the full page snapshot
                    const snapRes = await this.client.snapshot(type === 'element_visible' ? selector : undefined);
                    const snapText = snapRes.content?.[0]?.text || "";
                    if (type === 'element_visible') {
                        success = snapText.length > 0 && !snapText.includes("not found") && !snapText.includes("Error");
                        actualValue = success ? "Visible" : "Not Found";
                    }
                    else {
                        success = snapText.includes(expected);
                        actualValue = success ? `Found ${expected}` : `Not found`;
                    }
                    break;
                case 'element_count':
                    // Since MCP doesn't natively expose counts easily via snapshot without parsing the whole tree,
                    // we will do a soft check by checking if snapshot has content for that selector.
                    logs.push(`Checking snapshot for elements: ${selector}`);
                    const countSnap = await this.client.snapshot();
                    // Just count occurrences of the selector name in the snapshot as a rough proxy for POC
                    // e.g. "inventory_item"
                    const searchStr = (selector || "").replace('.', '');
                    const count = (countSnap.content?.[0]?.text || "").split(searchStr).length - 1;
                    actualValue = count;
                    success = count >= expected; // soft check >= expected
                    break;
                case 'url_matches':
                    logs.push(`Checking URL (using snapshot content heuristic): ${expected}`);
                    const urlSnap = await this.client.snapshot();
                    const text = urlSnap.content?.[0]?.text || "";
                    // The Playwright MCP snapshot usually includes the URL at the top
                    success = text.includes(expected);
                    actualValue = success ? "URL matched" : "URL not matched in snapshot";
                    break;
                default:
                    throw new Error(`Unknown assertion type: ${type}`);
            }
            if (!success) {
                throw new Error(`Assertion failed: expected ${expected}, got ${actualValue}`);
            }
            logs.push(`Assertion passed!`);
            return {
                agentType: AgentType.ASSERTION,
                success: true,
                data: { actualValue },
                durationMs: Date.now() - start,
                logs
            };
        }
        catch (error) {
            logs.push(`Assertion error: ${error.message}`);
            return {
                agentType: AgentType.ASSERTION,
                success: false,
                error: error.message,
                durationMs: Date.now() - start,
                logs
            };
        }
    }
}
