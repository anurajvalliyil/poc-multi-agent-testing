import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  
  const tools = await client.listTools();
  console.log("Tools summary:");
  tools.tools.forEach((t: any) => {
    console.log(`- ${t.name}: ${t.description}`);
  });
  
  await transport.close();
}

main().catch(console.error);
