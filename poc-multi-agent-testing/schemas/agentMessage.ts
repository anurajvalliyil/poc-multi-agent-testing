export enum AgentType {
  ORCHESTRATOR = 'ORCHESTRATOR',
  NAVIGATOR = 'NAVIGATOR',
  ASSERTION = 'ASSERTION',
  DATA = 'DATA',
  REPAIR = 'REPAIR',
  REPORTER = 'REPORTER'
}

export interface AgentMessage<TPayload = any> {
  id: string;
  from: AgentType;
  to: AgentType;
  timestamp: string;
  taskDescription: string;
  payload: TPayload;
}

export interface AgentResult<TData = any> {
  agentType: AgentType;
  success: boolean;
  data?: TData;
  error?: string;
  durationMs: number;
  logs: string[];
}

export interface DelegationRecord {
  id: string;
  agent: AgentType;
  taskDescription: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  inputPayload: any;
  outputData?: any;
  error?: string;
}

export interface TestStepResult {
  id: string;
  action: string;
  status: 'passed' | 'failed' | 'skipped' | 'repaired';
  durationMs: number;
  error?: string;
}
