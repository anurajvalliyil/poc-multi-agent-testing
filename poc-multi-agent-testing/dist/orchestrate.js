import { PlaywrightClient } from './mcp/playwrightClient.js';
import { NavigatorAgent } from './agents/navigator.js';
import { AssertionAgent } from './agents/assertion.js';
import { DataAgent } from './agents/data.js';
import { RepairAgent } from './agents/repair.js';
import { ReporterAgent } from './agents/reporter.js';
import { OrchestratorAgent } from './agents/orchestrator.js';
const DEMO_GOAL = {
    description: "Validate the full checkout flow on demo e-commerce site",
    steps: [
        {
            id: "1",
            type: "navigation",
            action: "navigate",
            target: "https://www.saucedemo.com"
        },
        {
            id: "2",
            type: "navigation",
            action: "type",
            target: "[data-test=\"username\"]",
            value: "standard_user"
        },
        {
            id: "2.1",
            type: "navigation",
            action: "type",
            target: "[data-test=\"password\"]",
            value: "secret_sauce"
        },
        {
            id: "2.2",
            type: "navigation",
            action: "click",
            target: "[data-test=\"login-button\"]"
        },
        {
            id: "3",
            type: "assertion",
            action: "check products",
            target: "Products",
            assertion: "text_contains=Products"
        },
        {
            id: "4",
            type: "navigation",
            action: "click first item",
            target: "[data-test=\"add-to-cart-sauce-labs-backpackk\"]" // Intentional Typo! 'backpackk'
        },
        {
            id: "4.1",
            type: "navigation",
            action: "click second item",
            target: "[data-test=\"add-to-cart-sauce-labs-bike-light\"]"
        },
        {
            id: "5",
            type: "navigation",
            action: "navigate",
            target: "https://www.saucedemo.com/cart.html"
        },
        {
            id: "5.0",
            type: "navigation",
            action: "wait"
        },
        {
            id: "5.1",
            type: "assertion",
            action: "check cart count",
            target: "2",
            assertion: "text_contains=2"
        },
        {
            id: "6.0",
            type: "navigation",
            action: "wait"
        },
        {
            id: "6",
            type: "navigation",
            action: "navigate",
            target: "https://www.saucedemo.com/checkout-step-one.html"
        },
        {
            id: "6.1",
            type: "navigation",
            action: "type",
            target: "[data-test=\"firstName\"]",
            value: "@data.checkout.firstName" // Fetched from DataAgent dynamically
        },
        {
            id: "6.2",
            type: "navigation",
            action: "type",
            target: "[data-test=\"lastName\"]",
            value: "@data.checkout.lastName"
        },
        {
            id: "6.3",
            type: "navigation",
            action: "type",
            target: "[data-test=\"postalCode\"]",
            value: "@data.checkout.postalCode"
        },
        {
            id: "7",
            type: "navigation",
            action: "navigate",
            target: "https://www.saucedemo.com/checkout-step-two.html"
        },
        {
            id: "7.0.1",
            type: "navigation",
            action: "wait"
        },
        {
            id: "7.1",
            type: "navigation",
            action: "navigate",
            target: "https://www.saucedemo.com/checkout-complete.html"
        },
        {
            id: "7.2",
            type: "assertion",
            action: "verify complete",
            target: "Thank you for your order",
            assertion: "text_contains=Thank you for your order"
        }
    ]
};
const DEMO_GOAL_LOCKED_OUT = {
    description: "Verify locked out user receives an error message",
    steps: [
        { id: "0", type: "navigation", action: "navigate", target: "about:blank" },
        { id: "1", type: "navigation", action: "navigate", target: "https://www.saucedemo.com" },
        { id: "2", type: "navigation", action: "type", target: "[data-test=\"username\"]", value: "locked_out_user" },
        { id: "3", type: "navigation", action: "type", target: "[data-test=\"password\"]", value: "secret_sauce" },
        { id: "4", type: "navigation", action: "click", target: "[data-test=\"login-button\"]" },
        { id: "4.1", type: "navigation", action: "wait" },
        { id: "5", type: "assertion", action: "verify error", target: "locked out", assertion: "text_contains=locked out" }
    ]
};
const DEMO_GOAL_REMOVE_CART = {
    description: "Add an item to the cart and then remove it",
    steps: [
        { id: "0", type: "navigation", action: "navigate", target: "about:blank" },
        { id: "1", type: "navigation", action: "navigate", target: "https://www.saucedemo.com" },
        { id: "2", type: "navigation", action: "type", target: "[data-test=\"username\"]", value: "standard_user" },
        { id: "3", type: "navigation", action: "type", target: "[data-test=\"password\"]", value: "secret_sauce" },
        { id: "4", type: "navigation", action: "click", target: "[data-test=\"login-button\"]" },
        { id: "4.1", type: "navigation", action: "wait" },
        { id: "5", type: "navigation", action: "click", target: "[data-test=\"add-to-cart-sauce-labs-fleece-jacket\"]" },
        { id: "6", type: "navigation", action: "navigate", target: "https://www.saucedemo.com/cart.html" },
        { id: "6.1", type: "navigation", action: "wait" },
        { id: "7", type: "assertion", action: "check cart count", target: "1", assertion: "text_contains=1" },
        { id: "8", type: "navigation", action: "click", target: "[data-test=\"remove-sauce-labs-fleece-jacket\"]" },
        { id: "9", type: "navigation", action: "click", target: "#react-burger-menu-btn" },
        { id: "10", type: "navigation", action: "wait" },
        { id: "11", type: "navigation", action: "click", target: "#logout_sidebar_link" }
    ]
};
async function main() {
    console.log("Starting POC Orchestration Engine...");
    // 1. Initialize MCP Client
    const mcpClient = new PlaywrightClient();
    await mcpClient.connect();
    // 2. Initialize Skill Agents
    const navigator = new NavigatorAgent(mcpClient);
    const assertion = new AssertionAgent(mcpClient);
    const data = new DataAgent();
    const repair = new RepairAgent(mcpClient);
    const reporter = new ReporterAgent();
    // 3. Initialize Orchestrator
    const orchestrator = new OrchestratorAgent(navigator, assertion, data, repair, reporter);
    // 4. Execute Flow
    try {
        const goals = [DEMO_GOAL, DEMO_GOAL_LOCKED_OUT, DEMO_GOAL_REMOVE_CART];
        for (const goal of goals) {
            await orchestrator.executeGoal(goal);
        }
        // 5. Generate Final Multi-Goal Report
        await orchestrator.generateFinalReport();
    }
    catch (err) {
        console.error("Execution failed:", err);
    }
    finally {
        await mcpClient.disconnect();
    }
}
main().catch(console.error);
