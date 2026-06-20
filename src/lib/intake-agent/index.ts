export { IntakeAgentService, intakeAgentService } from '@/lib/intake-agent/intake-agent.service';
export {
  INTAKE_AGENT_TOOLS,
  INTAKE_AGENT_SYSTEM_PROMPT,
  executeIntakeAgentTool,
  type IntakeAgentToolName,
} from '@/lib/intake-agent/intake-agent-tools';
export {
  searchCategoryRoutesVector,
  listCategoryRoutes,
  queryIntakeRulesVector,
  fetchIntakeRulesForCategory,
} from '@/lib/intake-agent/intake-vector-search';
export { validateAndFillIntake, validateAgainstConstraints } from '@/lib/intake-agent/intake-rule-validator';
export type * from '@/lib/intake-agent/types';
