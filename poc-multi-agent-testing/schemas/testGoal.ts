export interface TestGoal {
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  id: string;
  type: 'navigation' | 'assertion' | 'data' | 'system';
  action: string;
  target?: string;
  value?: string;
  assertion?: string;
  locatorOverride?: string;
}
