import { AgentType, AgentMessage, AgentResult, DelegationRecord, TestStepResult } from '../schemas/agentMessage.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface GoalRunResult {
  goalDescription: string;
  testSteps: TestStepResult[];
  delegationChain: DelegationRecord[];
}

export interface ReporterPayload {
  runs: GoalRunResult[];
}

export class ReporterAgent {
  async execute(message: AgentMessage<ReporterPayload>): Promise<AgentResult> {
    const start = Date.now();
    const logs: string[] = [];
    const { runs } = message.payload;

    try {
      logs.push(`Reporter Agent analyzing test results for ${runs.length} goals...`);

      let totalPassed = 0;
      let totalFailed = 0;
      let totalSkipped = 0;
      let totalRepaired = 0;
      let totalSteps = 0;
      let totalDurationMs = 0;

      runs.forEach(run => {
        totalPassed += run.testSteps.filter(s => s.status === 'passed').length;
        totalFailed += run.testSteps.filter(s => s.status === 'failed').length;
        totalSkipped += run.testSteps.filter(s => s.status === 'skipped').length;
        totalRepaired += run.testSteps.filter(s => s.status === 'repaired').length;
        totalSteps += run.testSteps.length;
        totalDurationMs += run.delegationChain.reduce((sum, r) => sum + r.durationMs, 0);
      });

      const reportData = {
        summary: {
          total: totalSteps,
          passed: totalPassed,
          failed: totalFailed,
          skipped: totalSkipped,
          repaired: totalRepaired,
          durationMs: totalDurationMs,
          timestamp: new Date().toISOString()
        },
        runs
      };

      const markdownData = this.generateMarkdown(reportData);
      const htmlData = this.generateHtml(reportData);

      // Write to reports directory
      const reportsDir = path.join(process.cwd(), 'reports');
      await fs.mkdir(reportsDir, { recursive: true });

      const jsonPath = path.join(reportsDir, 'poc-report.json');
      const mdPath = path.join(reportsDir, 'poc-report.md');
      const htmlPath = path.join(reportsDir, 'poc-report.html');

      await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2));
      await fs.writeFile(mdPath, markdownData);
      await fs.writeFile(htmlPath, htmlData);

      logs.push(`Report generated successfully at ./reports/poc-report.json, ./reports/poc-report.md, and ./reports/poc-report.html`);

      return {
        agentType: AgentType.REPORTER,
        success: true,
        durationMs: Date.now() - start,
        logs
      };
    } catch (error: any) {
      logs.push(`Reporter error: ${error.message}`);
      return {
        agentType: AgentType.REPORTER,
        success: false,
        error: error.message,
        durationMs: Date.now() - start,
        logs
      };
    }
  }

  private generateMarkdown(data: any): string {
    let md = `# Multi-Agent Test Execution Report\n\n`;
    md += `**Date:** ${data.summary.timestamp}\n`;
    md += `**Total Duration:** ${data.summary.durationMs}ms\n\n`;

    md += `## Summary\n`;
    md += `- **Total Steps:** ${data.summary.total}\n`;
    md += `- **Passed:** ✅ ${data.summary.passed}\n`;
    md += `- **Repaired:** 🔧 ${data.summary.repaired}\n`;
    md += `- **Failed:** ❌ ${data.summary.failed}\n`;
    md += `- **Skipped:** ⏭️ ${data.summary.skipped}\n\n`;

    data.runs.forEach((run: any, idx: number) => {
      md += `\n---\n## Goal ${idx + 1}: ${run.goalDescription}\n\n`;
      md += `### Step Details\n`;
      md += `| ID | Action | Status | Duration (ms) | Error |\n`;
      md += `|---|---|---|---|---|\n`;
      run.testSteps.forEach((s: any) => {
        let icon = '⏭️';
        if (s.status === 'passed') icon = '✅';
        if (s.status === 'failed') icon = '❌';
        if (s.status === 'repaired') icon = '🔧';
        md += `| ${s.id} | ${s.action} | ${icon} | ${s.durationMs} | ${s.error || '-'} |\n`;
      });

      md += `\n### Agent Delegation Trace\n`;
      run.delegationChain.forEach((r: any) => {
        md += `#### [${new Date(r.timestamp).toLocaleTimeString()}] ${r.agent}\n`;
        md += `- **Task:** ${r.taskDescription}\n`;
        md += `- **Status:** ${r.success ? 'Success' : 'Failed'}\n`;
        md += `- **Duration:** ${r.durationMs}ms\n`;
        if (r.error) md += `- **Error:** ${r.error}\n`;
        md += `\n`;
      });
    });

    return md;
  }

  private generateHtml(data: any): string {
    const passedCount = data.summary.passed;
    const failedCount = data.summary.failed;
    const repairedCount = data.summary.repaired;
    const totalCount = data.summary.total;
    const isSuccess = failedCount === 0;
    
    let goalsHtml = '';

    data.runs.forEach((run: any, idx: number) => {
      const stepsHtml = run.testSteps.map((s: any) => {
        let statusIcon = '⏭️';
        let statusClass = 'text-gray-400';
        if (s.status === 'passed') { statusIcon = '✅'; statusClass = 'text-green-400'; }
        if (s.status === 'failed') { statusIcon = '❌'; statusClass = 'text-red-400'; }
        if (s.status === 'repaired') { statusIcon = '🔧'; statusClass = 'text-yellow-400'; }
        
        return `
          <tr class="border-b border-gray-700/50 hover:bg-white/5 transition-colors duration-200">
            <td class="px-6 py-4 font-mono text-sm">${s.id}</td>
            <td class="px-6 py-4 font-semibold">${s.action}</td>
            <td class="px-6 py-4 ${statusClass}">${statusIcon} <span class="uppercase text-xs tracking-wider font-bold ml-1">${s.status}</span></td>
            <td class="px-6 py-4 font-mono text-sm">${s.durationMs}ms</td>
            <td class="px-6 py-4 text-red-300 text-sm max-w-md truncate" title="${s.error || ''}">${s.error || '-'}</td>
          </tr>
        `;
      }).join('');

      const delegationHtml = run.delegationChain.map((r: any) => {
        const statusClass = r.success ? 'border-l-green-500' : 'border-l-red-500';
        const agentColors: Record<string, string> = {
          'NAVIGATOR': 'text-blue-400',
          'ASSERTION': 'text-purple-400',
          'REPAIR': 'text-yellow-400',
          'DATA': 'text-pink-400',
          'REPORTER': 'text-teal-400',
        };
        const agentColor = agentColors[r.agent] || 'text-gray-400';
        
        return `
          <div class="mb-6 ml-6 relative group">
            <span class="absolute -left-9 flex items-center justify-center w-6 h-6 bg-gray-800 rounded-full ring-4 ring-[#0f172a]">
              <div class="w-2 h-2 rounded-full ${r.success ? 'bg-green-500' : 'bg-red-500'}"></div>
            </span>
            <div class="p-5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md shadow-xl border-l-4 ${statusClass} transition-all duration-300 hover:-translate-y-1 hover:bg-white/10">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg ${agentColor}">${r.agent}</h3>
                <span class="text-xs text-gray-400 font-mono bg-black/30 px-2 py-1 rounded">${new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
              <p class="text-gray-200 mb-3"><span class="text-gray-400 text-sm uppercase tracking-wider mr-2">Task:</span> ${r.taskDescription}</p>
              <div class="flex items-center space-x-4 text-sm font-mono mb-2">
                <span class="${r.success ? 'text-green-400' : 'text-red-400'}">${r.success ? 'SUCCESS' : 'FAILED'}</span>
                <span class="text-gray-400">⏱ ${r.durationMs}ms</span>
              </div>
              ${r.error ? `<div class="mt-3 p-3 bg-red-500/10 rounded border border-red-500/20 text-red-300 text-sm font-mono overflow-x-auto">${r.error}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      goalsHtml += `
      <div class="mb-12 glass rounded-3xl overflow-hidden shadow-2xl">
        <div class="px-8 py-6 border-b border-white/10 bg-white/5">
          <h2 class="text-2xl font-bold text-white flex items-center mb-2">
            <svg class="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Goal ${idx + 1}: <span class="ml-2 font-medium text-gray-300">${run.goalDescription}</span>
          </h2>
        </div>
        
        <div class="p-8">
          <h3 class="text-xl font-bold text-gray-200 mb-4 border-b border-white/10 pb-2">Step Details</h3>
          <div class="overflow-x-auto mb-8 bg-black/20 rounded-xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-gray-400 text-sm uppercase tracking-wider border-b border-gray-700/50">
                  <th class="px-6 py-4 font-medium">ID</th>
                  <th class="px-6 py-4 font-medium">Action</th>
                  <th class="px-6 py-4 font-medium">Status</th>
                  <th class="px-6 py-4 font-medium">Duration</th>
                  <th class="px-6 py-4 font-medium">Error</th>
                </tr>
              </thead>
              <tbody class="text-gray-300">
                ${stepsHtml}
              </tbody>
            </table>
          </div>

          <h3 class="text-xl font-bold text-gray-200 mb-6 border-b border-white/10 pb-2">Agent Delegation Trace</h3>
          <div class="border-l-2 border-gray-800 ml-4 relative">
            ${delegationHtml}
          </div>
        </div>
      </div>
      `;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Agent Execution Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            dark: '#0f172a',
            darker: '#020617',
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #0f172a;
      background-image: radial-gradient(circle at 15% 50%, rgba(56, 189, 248, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.08), transparent 25%);
      color: #e2e8f0;
    }
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .gradient-text {
      background: linear-gradient(to right, #38bdf8, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="min-h-screen py-12 px-4 sm:px-6 lg:px-8 selection:bg-purple-500/30">
  <div class="max-w-7xl mx-auto space-y-12">
    
    <!-- Header Section -->
    <header class="text-center space-y-4 relative">
      <div class="inline-flex items-center justify-center space-x-3 mb-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
        </div>
        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-white">Multi-Agent <span class="gradient-text">Orchestration</span></h1>
      </div>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">Execution report generated on ${new Date(data.summary.timestamp).toLocaleString()}</p>
      
      <!-- Global Status Badge -->
      <div class="absolute top-0 right-0 hidden md:block">
        <div class="px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl border ${isSuccess ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/10' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/10'}">
          ${isSuccess ? '✅ All Goals Passed' : '❌ Goals Failed'}
        </div>
      </div>
    </header>

    <!-- Metrics Dashboard -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      <div class="glass rounded-2xl p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <p class="text-gray-400 font-medium text-sm tracking-wider uppercase mb-2">Total Steps</p>
        <p class="text-4xl font-bold text-white">${totalCount}</p>
      </div>
      <div class="glass rounded-2xl p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <p class="text-green-400/80 font-medium text-sm tracking-wider uppercase mb-2">Passed</p>
        <p class="text-4xl font-bold text-green-400">${passedCount}</p>
      </div>
      <div class="glass rounded-2xl p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <p class="text-yellow-400/80 font-medium text-sm tracking-wider uppercase mb-2">Repaired</p>
        <p class="text-4xl font-bold text-yellow-400">${repairedCount}</p>
      </div>
      <div class="glass rounded-2xl p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <p class="text-red-400/80 font-medium text-sm tracking-wider uppercase mb-2">Failed</p>
        <p class="text-4xl font-bold text-red-400">${failedCount}</p>
      </div>
      <div class="glass rounded-2xl p-6 relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <p class="text-purple-400/80 font-medium text-sm tracking-wider uppercase mb-2">Duration</p>
        <p class="text-3xl font-bold text-purple-400">${data.summary.durationMs} <span class="text-sm">ms</span></p>
      </div>
    </div>

    <!-- Goals Sections -->
    <div class="space-y-12">
      ${goalsHtml}
    </div>
    
  </div>
</body>
</html>`;
  }
}
