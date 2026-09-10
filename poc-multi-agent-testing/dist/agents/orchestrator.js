import { AgentType } from '../schemas/agentMessage.js';
import { randomUUID } from 'crypto';
export class OrchestratorAgent {
    skillRegistry = new Map();
    delegationChain = [];
    stepResults = [];
    runs = [];
    constructor(navigator, assertion, data, repair, reporter) {
        this.skillRegistry.set(AgentType.NAVIGATOR, navigator);
        this.skillRegistry.set(AgentType.ASSERTION, assertion);
        this.skillRegistry.set(AgentType.DATA, data);
        this.skillRegistry.set(AgentType.REPAIR, repair);
        this.skillRegistry.set(AgentType.REPORTER, reporter);
    }
    async executeGoal(goal) {
        this.delegationChain = [];
        this.stepResults = [];
        console.log(`\n======================================================`);
        console.log(`[ORCHESTRATOR] Received New Goal: ${goal.description}`);
        console.log(`======================================================\n`);
        for (const step of goal.steps) {
            const stepResult = {
                id: step.id,
                action: step.action,
                status: 'skipped',
                durationMs: 0
            };
            try {
                console.log(`\n--- Step: ${step.id} - ${step.action} ---`);
                const start = Date.now();
                let currentLocator = step.target;
                let wasRepaired = false;
                // 1. Data Provisioning
                let testData = null;
                if (step.type === 'data' || step.value?.startsWith('@data.')) {
                    const parts = (step.value || '').split('.'); // e.g. ["@data", "checkout", "firstName"]
                    const context = parts.length > 1 ? parts[1] : (step.target || 'login');
                    const dataResult = await this.delegate(AgentType.DATA, `Fetch data for ${context}`, { context });
                    testData = dataResult.data;
                }
                // 2. Navigation / Interaction
                if (step.type === 'navigation') {
                    let value = step.value;
                    if (value && value.startsWith('@data.')) {
                        const parts = value.split('.'); // ["@data", "checkout", "firstName"]
                        const field = parts[2];
                        value = testData[field];
                    }
                    let result = await this.delegate(AgentType.NAVIGATOR, step.action, {
                        action: step.action.split(' ')[0], // e.g. "navigate", "click", "type"
                        target: currentLocator,
                        value: value,
                        url: step.target
                    });
                    // Self-Healing
                    if (!result.success && currentLocator) {
                        console.log(`\n[ORCHESTRATOR] Step failed. Escalating to REPAIR Agent...`);
                        const repairResult = await this.delegate(AgentType.REPAIR, `Repair locator: ${currentLocator}`, {
                            failedLocator: currentLocator,
                            action: step.action
                        });
                        if (repairResult.success && repairResult.data?.correctedLocator) {
                            console.log(`[ORCHESTRATOR] Repair successful! Retrying step with: ${repairResult.data.correctedLocator}`);
                            currentLocator = repairResult.data.correctedLocator;
                            result = await this.delegate(AgentType.NAVIGATOR, `Retry ${step.action} with repaired locator`, {
                                action: step.action.split(' ')[0],
                                target: currentLocator,
                                value: value
                            });
                            if (result.success) {
                                wasRepaired = true;
                            }
                        }
                        if (!result.success) {
                            throw new Error(`Step failed even after repair attempt: ${result.error}`);
                        }
                    }
                }
                // 3. Assertion
                if (step.type === 'assertion' || step.assertion) {
                    const assertTarget = step.assertion || step.action;
                    const [type, expectedRaw] = assertTarget.split('=');
                    let expected = expectedRaw;
                    if (type === 'element_count')
                        expected = parseInt(expectedRaw, 10);
                    const result = await this.delegate(AgentType.ASSERTION, `Assert ${type}`, {
                        type,
                        selector: currentLocator,
                        expected
                    });
                    if (!result.success) {
                        throw new Error(`Assertion failed: ${result.error}`);
                    }
                }
                stepResult.status = wasRepaired ? 'repaired' : 'passed';
                stepResult.durationMs = Date.now() - start;
            }
            catch (e) {
                console.error(`[ORCHESTRATOR] Error executing step ${step.id}: ${e.message}`);
                stepResult.status = 'failed';
                stepResult.error = e.message;
                this.stepResults.push(stepResult);
                break; // Stop on failure
            }
            this.stepResults.push(stepResult);
        }
        this.runs.push({
            goalDescription: goal.description,
            testSteps: this.stepResults,
            delegationChain: this.delegationChain
        });
        console.log(`\n======================================================`);
        console.log(`[ORCHESTRATOR] Goal execution finished.`);
        console.log(`======================================================\n`);
    }
    async generateFinalReport() {
        console.log(`\n======================================================`);
        console.log(`[ORCHESTRATOR] Generating Final Aggregated Report...`);
        await this.delegate(AgentType.REPORTER, 'Generate final report', {
            runs: this.runs
        });
        console.log(`[ORCHESTRATOR] Done.`);
    }
    async delegate(agentType, description, payload) {
        const handler = this.skillRegistry.get(agentType);
        if (!handler) {
            throw new Error(`No handler registered for skill: ${agentType}`);
        }
        const message = {
            id: randomUUID(),
            from: AgentType.ORCHESTRATOR,
            to: agentType,
            timestamp: new Date().toISOString(),
            taskDescription: description,
            payload
        };
        const start = Date.now();
        let result;
        try {
            result = await handler.execute(message);
        }
        catch (e) {
            result = {
                agentType,
                success: false,
                error: e.message,
                durationMs: Date.now() - start,
                logs: [`Fatal handler error: ${e.message}`]
            };
        }
        const record = {
            id: message.id,
            agent: agentType,
            taskDescription: description,
            timestamp: message.timestamp,
            durationMs: result.durationMs,
            success: result.success,
            inputPayload: agentType === AgentType.REPORTER ? '[Report Data Omitted]' : payload,
            outputData: result.data,
            error: result.error
        };
        this.delegationChain.push(record);
        this.printTrace(record, result.logs);
        return result;
    }
    printTrace(record, logs) {
        const color = record.success ? '\x1b[32m' : '\x1b[31m'; // Green or Red
        const reset = '\x1b[0m';
        const arrow = '\x1b[36m→\x1b[0m'; // Cyan
        console.log(`${arrow} [${record.timestamp}] Delegate to ${record.agent}`);
        console.log(`  Task: ${record.taskDescription}`);
        logs.forEach(l => console.log(`  | ${l}`));
        console.log(`  Status: ${color}${record.success ? 'Success' : 'Failed'}${reset} (${record.durationMs}ms)`);
    }
}
