export const AI_AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'check_user_account_status',
      description:
        'Current user account: role, business profile, wallet balance, AI message affordability',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_needs_agent',
      description:
        'Semantic search for relevant public active needs. Use ONLY when the user asks about needs, services, or listings. Never enumerate neighborhoods — pass location as a search hint.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'User intent in Persian (required)' },
          category: { type: 'string', description: 'Category slug or name (optional)' },
          location: {
            type: 'string',
            description: 'City/neighborhood hint — resolved via vector search (optional)',
          },
          limit: { type: 'integer', minimum: 1, maximum: 5, description: 'Max results (default 5)' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_site_categories',
      description: 'Active site category tree for user guidance',
      parameters: {
        type: 'object',
        properties: {
          depth: { type: 'integer', minimum: 1, maximum: 3, description: 'Tree depth' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_site_categories',
      description: 'Search site categories by Persian name, slug, or path',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search text (optional — returns top categories if empty)' },
          limit: { type: 'integer', minimum: 1, maximum: 40, description: 'Max results' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_site_cities',
      description: 'Search cities and provinces supported on the platform',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'City name or slug (optional)' },
          province: { type: 'string', description: 'Province name filter (optional)' },
          limit: { type: 'integer', minimum: 1, maximum: 40, description: 'Max results' },
        },
        additionalProperties: false,
      },
    },
  },
];

export type AiAgentToolName =
  | 'check_user_account_status'
  | 'search_needs_agent'
  | 'get_site_categories'
  | 'search_site_categories'
  | 'search_site_cities';
