import { Agent, Runner, setDefaultModelProvider, withTrace } from '@openai/agents';
import {
  OpenAIProvider,
  fileSearchTool,
  setDefaultOpenAITracingExporter,
  webSearchTool,
} from '@openai/agents-openai';
import { searchUserVectorStore } from './vector-store.js';

// Ensure all agent runs share the same provider instance (avoids trace context mismatches)
setDefaultModelProvider(new OpenAIProvider());
setDefaultOpenAITracingExporter();

const DEFAULT_MODEL = 'gpt-5-nano';
const DEFAULT_REASONING_EFFORT = 'high';
const DEFAULT_SERVICE_TIER = 'flex';

const webSearchPreview = webSearchTool({
  searchContextSize: 'medium',
  userLocation: {
    type: 'approximate',
  },
});

const businessModelFileSearch = fileSearchTool([
  'vs_695faa4ec07481918e7ec49bcaed5cf9',
]);

const fourBallModelOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'opening_paragraph', 'opportunity_space', 'checkpoint_validation'],
    properties: {
      agent: {
        type: 'string',
        description: 'The agent analyzing the market opportunity space.',
        default: '',
      },
      opening_paragraph: {
        type: 'string',
        description: 'Introductory paragraph summarizing the opportunity space.',
        default: '',
      },
      opportunity_space: {
        type: 'object',
        additionalProperties: false,
        required: [
          'competitor_oversight',
          'innovation_core',
          'changing_circumstances',
          'reframing',
        ],
        properties: {
          competitor_oversight: {
            type: 'object',
            additionalProperties: false,
            required: ['blind_spots', 'poor_executions'],
            properties: {
              blind_spots: {
                type: 'array',
                items: { type: 'string' },
                description: 'Areas competitors fail to see or address.',
                default: [],
              },
              poor_executions: {
                type: 'array',
                items: { type: 'string' },
                description:
                  "Instances of competitors' failed or suboptimal implementations.",
                default: [],
              },
            },
          },
          innovation_core: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'description', 'moat_strength'],
            properties: {
              type: {
                type: 'string',
                description:
                  'Type or category of innovation at the core of the opportunity.',
                default: '',
              },
              description: {
                type: 'string',
                description:
                  'A description providing context on the innovation.',
                default: '',
              },
              moat_strength: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'How strong the competitive moat is.',
                default: 'low',
              },
            },
          },
          changing_circumstances: {
            type: 'object',
            additionalProperties: false,
            required: ['regulatory_shifts', 'tech_tailwinds', 'consumer_behavior'],
            properties: {
              regulatory_shifts: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Regulatory changes affecting the opportunity space.',
                default: [],
              },
              tech_tailwinds: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Technological advancements favoring the opportunity.',
                default: [],
              },
              consumer_behavior: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Shifts in consumer behavior relevant to the opportunity.',
                default: [],
              },
            },
          },
          reframing: {
            type: 'object',
            additionalProperties: false,
            required: ['old_frame', 'new_frame'],
            properties: {
              old_frame: {
                type: 'string',
                description:
                  'The previous perspective or frame for the opportunity.',
                default: '',
              },
              new_frame: {
                type: 'string',
                description: 'The new or reframed opportunity perspective.',
                default: '',
              },
            },
          },
        },
      },
      checkpoint_validation: {
        type: 'boolean',
        description: 'Whether the checkpoint has been validated as correct.',
        default: false,
      },
    },
  },
};

const cruxOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'opening_paragraph', 'crux_analysis', 'checkpoint_solvability_confirmed'],
    properties: {
      agent: {
        type: 'string',
        description: 'The name of the agent performing the analysis.',
        default: '',
      },
      opening_paragraph: {
        type: 'string',
        description: 'Introductory paragraph summarizing the crux analysis.',
        default: '',
      },
      crux_analysis: {
        type: 'object',
        additionalProperties: false,
        description: 'Analysis of the main bottleneck and leverage point.',
        required: [
          'distilled_bottleneck',
          'leverage_point',
          'justification',
          'solvability_score',
        ],
        properties: {
          distilled_bottleneck: {
            type: 'string',
            description:
              'A brief summary of the central bottleneck or obstacle.',
            default: '',
          },
          leverage_point: {
            type: 'string',
            description: 'The most strategic intervention point identified.',
            default: '',
          },
          justification: {
            type: 'object',
            additionalProperties: false,
            description: 'Details that justify the leverage point chosen.',
            required: ['cascade_logic', 'root_cause_identified'],
            properties: {
              cascade_logic: {
                type: 'string',
                description:
                  'Explanation of the cascade of effects that solving the bottleneck would have.',
                default: '',
              },
              root_cause_identified: {
                type: 'string',
                description:
                  'Description of the underlying root cause that has been identified.',
                default: '',
              },
            },
          },
          solvability_score: {
            type: 'number',
            description: 'Score between 1-10 assessing how solvable the situation is.',
            default: 0,
          },
        },
      },
      checkpoint_solvability_confirmed: {
        type: 'boolean',
        description:
          'Confirmation that the solvability score has been checked and confirmed.',
        default: false,
      },
    },
  },
};

const extendedAnalysisOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'agent',
      'page_5_opening_paragraph',
      'page_5_reference_cases',
      'page_6_final_summary',
      'verdict',
    ],
    properties: {
      agent: {
        type: 'string',
        description: 'The agent generating pages 5 and 6 of the report.',
        default: '',
      },
      page_5_opening_paragraph: {
        type: 'string',
        description: 'Introductory paragraph framing the reference cases.',
        default: '',
      },
      page_5_reference_cases: {
        type: 'array',
        description: 'Closest analogues and what to learn from them.',
        default: [],
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'case_name',
            'relevance_factor',
            'actionable_learnings',
            'improvements',
          ],
          properties: {
            case_name: { type: 'string', default: '' },
            relevance_factor: { type: 'string', default: '' },
            actionable_learnings: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            improvements: {
              type: 'object',
              additionalProperties: false,
              required: ['brand_gtm', 'operational', 'strategic_pivot', 'financing'],
              properties: {
                brand_gtm: { type: 'string', default: '' },
                operational: { type: 'string', default: '' },
                strategic_pivot: { type: 'string', default: '' },
                financing: { type: 'string', default: '' },
              },
            },
          },
        },
      },
      page_6_final_summary: {
        type: 'object',
        additionalProperties: false,
        required: [
          'opening_paragraph',
          'strengths',
          'weaknesses',
          'gaps',
          'strategic_potential',
          'next_steps',
        ],
        properties: {
          opening_paragraph: {
            type: 'string',
            description: 'Introductory paragraph summarizing the final summary.',
            default: '',
          },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          weaknesses: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          gaps: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strategic_potential: { type: 'string', default: '' },
          next_steps: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
      },
      verdict: {
        type: 'string',
        description:
          'Overall verdict on strategic coherence and potential (founder/investor-friendly).',
        default: '',
      },
    },
  },
};

const businessModelPatternOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['opening_paragraph', 'identified_patterns'],
    properties: {
      opening_paragraph: {
        type: 'string',
        description:
          'Introductory paragraph explaining the framing of the business model pattern analysis.',
        default: '',
      },
      identified_patterns: {
        type: 'array',
        description: 'Best-fit business model patterns with reasoning for each.',
        default: [],
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['pattern_name', 'description', 'reasoning'],
          properties: {
            pattern_name: {
              type: 'string',
              description: "Canonical name of the business model pattern.",
              default: '',
            },
            description: {
              type: 'string',
              description: 'How this pattern manifests in the specific business context.',
              default: '',
            },
            reasoning: {
              type: 'object',
              additionalProperties: false,
              required: ['logic', 'fit_indicators'],
              properties: {
                logic: {
                  type: 'string',
                  description:
                    'Why this pattern applies, linking observed facts to the pattern.',
                  default: '',
                },
                fit_indicators: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Concrete indicators or signals that justify selecting this pattern.',
                  default: [],
                },
              },
            },
          },
        },
      },
    },
  },
};

const rumeltGuidepostsOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['opening_paragraph', 'guideposts'],
    properties: {
      opening_paragraph: {
        type: 'string',
        description:
          'Introductory paragraph explaining key finding from rumelts guideposts',
        default: '',
      },
      guideposts: {
        type: 'array',
        description:
          "Analysis of each of Rumelt's 5 Guideposts as applied to the business opportunity.",
        default: [],
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['guidepost', 'relevant', 'explanation'],
          properties: {
            guidepost: {
              type: 'string',
              description: 'The name of the guidepost.',
              default: '',
            },
            relevant: {
              type: 'string',
              description: 'Is this guidepost relevant in the current industry context?',
              default: '',
            },
            explanation: {
              type: 'string',
              description:
                'Explain how the guidepost affects the competitive landscape and opportunity.',
              default: '',
            },
          },
        },
      },
    },
  },
};

const companyNameOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['company_name', 'confidence'],
    properties: {
      company_name: {
        type: 'string',
        description: 'Most likely company name extracted from the business plan.',
        default: '',
      },
      confidence: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Confidence in the extracted company name.',
        default: 'low',
      },
    },
  },
};

const fourBallAgent = new Agent({
  name: '4-Ball Model',
  instructions: `You are the Market Scout. Your task is to analyze the business case through the 4-Ball Model. You must validate the "Opportunity Space" by checking for:
Competitor Oversight: What are incumbents ignoring?
Innovation: What is the proprietary "secret sauce" (tech, process, or insight)?
Changing Circumstances: What tailwinds (regulation, tech shifts, social trends) make this possible now?
Seeing Differently: How is this reframing the problem?

Output requirements:
- Provide a brief opening paragraph summarizing the opportunity space (max 50 words).
- Keep each of the four sections to a maximum of 50 words.
- For any list fields, return at most 2 items and keep each item under 10 words.

You take a business plan as a input and may use the web search.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  tools: [webSearchPreview],
  outputType: fourBallModelOutputType,
  modelSettings: {
    reasoning: {
      effort: DEFAULT_REASONING_EFFORT,
    },
    store: true,
  },
});

const cruxAgent = new Agent({
  name: 'My agent',
  instructions: `You are the Strategist. Using Richard Rumelt’s framework, your job is to identify the Crux of the challenge.
Distillation: Strip away the noise to find the one bottleneck that matters most.
Coherence: Ensure the proposed path isn't a "wish list" but a focused response to the Crux.
Root Cause: Use cascade logic to prove why solving this specific point unlocks the rest of the opportunity.

Output requirements:
- Include a brief opening paragraph summarizing the crux.
- Keep every text field to a maximum of 50 words.

Use the provided business plan and web search.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  tools: [webSearchPreview],
  outputType: cruxOutputType,
  modelSettings: {
    reasoning: {
      effort: DEFAULT_REASONING_EFFORT,
    },
    store: true,
  },
});

const extendedAgent = new Agent({
  name: 'Pages 5, 6',
  instructions: `You are an expert Senior Strategic Business Analyst and Venture Consultant.
Your job is to produce Pages 5 and 6 of a Standardised Business Plan Analysis, using the provided business plan and the already-produced Page 1 and Page 2 outputs (included in the input). Page 3 is generated by a separate Rumelt’s 5 agent and Page 4 by a Business Model Pattern agent.

Tone & quality bar:
- Professional, insightful, investor-friendly.
- Direct, critical, constructive. Avoid generic fluff.
- Structured. Use clear headings and concise bullet points where appropriate.
- Make the storytelling coherent: Page 3–6 must align with the Opportunity Space (Page 1) and The Crux (Page 2).

You MUST output JSON only that matches the provided schema.
Output requirements:
- Provide an opening paragraph for Page 5 and Page 6.
- Keep every text field to a maximum of 50 words.
- For list fields, return at most 3 items and keep each item under 10 words.

Page 5: Reference Cases and Strategic Improvement Ideas
- Provide 2–4 closest analogues (companies or historical cases) and explain why they are relevant (similar crux/pattern/opportunity).
- Extract actionable learnings and translate into improvements across:
  - Brand / GTM
  - Operational innovations
  - Strategic pivots
  - Financing / partnerships

Page 6: Summary — What Works, What Needs Work
- Strengths, weaknesses, gaps.
- Strategic potential and 3–5 immediate next steps.
- Provide an overall verdict on coherence and potential.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  tools: [webSearchPreview],
  outputType: extendedAnalysisOutputType,
  modelSettings: {
    reasoning: {
      effort: DEFAULT_REASONING_EFFORT,
    },
    store: true,
  },
});

const rumeltGuidepostsAgent = new Agent({
  name: 'Rumelt’s 5 Guideposts',
  instructions: `You are a helpful assistant. You are an industry strategy analyst. Your task is to evaluate a specific business opportunity through the lens of Rumelt’s 5 Guideposts of Industry Dynamics from Good Strategy/Bad Strategy by Richard Rumelt. These guideposts signal industry change, competitive shifts, and structural dynamics that create strategic opportunities. The five guideposts to evaluate are:
Rising Fixed Costs
Deregulation / New Rules
Predictable Biases in Competition
Incumbent Response Lags
Attractor States
For each guidepost:
Determine whether it is relevant in the current industry context (Yes/No). If relevant, explain how it affects the competitive landscape, and how it strengthens or shapes the opportunity space. If not relevant, explain why not.
You may use web search to get the latest information.

Output requirements:
- Include a brief opening paragraph summarizing the guideposts.
- Keep each explanation to a maximum of 50 words on the introductio and only about 20 words on the impact section.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  tools: [webSearchPreview],
  outputType: rumeltGuidepostsOutputType,
  modelSettings: {
    reasoning: {
      effort: DEFAULT_REASONING_EFFORT,
    },
    temperature: 1,
    topP: 1,
    store: true,
  },
});

const businessModelPatternAgent = new Agent({
  name: 'Business Model Pattern Identification',
  instructions: `You are a Business Model Strategist with deep expertise in the Strategyzer Business Model Pattern Library and an extended set of custom patterns (e.g., Market Explorers, Resource Castles, Activity Differentiators, Revenue & Cost Differentiators). Your task is to analyze an opportunity, concept, or venture and identify the most suitable business model pattern(s) drawn from these libraries.
You must articulate your strategic reasoning step by step before selecting and stating your conclusions or recommendations.
Use relevant concepts such as:
- Core logic behind patterns (e.g., Product-as-a-Service, Freemium, Razor & Blade, Multi-Sided Platform)
- How patterns address value creation, delivery, and capture
- Pattern-fit with customer jobs, economics, and strategic context
Your output must follow this JSON schema exactly.

Output requirements:
- Keep every text field to a maximum of 50 words.
- Return at most 3 patterns.
- Keep each fit indicator under 10 words and return at most 3.
If the pattern fit is unclear, return an empty list.

📌 Remember:
A business model pattern is a reusable “design move” that explains how an organization creates, delivers, and captures value, helping rethink a business model beyond traditional product, price, or technology competition.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  tools: [businessModelFileSearch],
  outputType: businessModelPatternOutputType,
  modelSettings: {
    reasoning: {
      effort: DEFAULT_REASONING_EFFORT,
    },
    temperature: 1,
    topP: 1,
    toolChoice: 'required',
    store: true,
  },
});

const companyNameAgent = new Agent({
  name: 'Company Name Extractor',
  instructions: `Extract the company or product name from the business plan text.
Return only JSON that matches the provided schema.
If the company name is unclear, return an empty string with low confidence.`,
  model: DEFAULT_MODEL,
  service_tier: DEFAULT_SERVICE_TIER,
  outputType: companyNameOutputType,
  modelSettings: {
    reasoning: {
      effort: 'low',
    },
    store: true,
  },
});

const parseReportJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (_error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = text.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error('OpenAI returned invalid JSON');
  }
};

const buildUserHistoryContext = (results) => {
  if (!Array.isArray(results) || !results.length) {
    return '';
  }

  const blocks = results.slice(0, 4).map((item, index) => {
    const title = String(item?.title || '').trim();
    const reportId = item?.reportId ? `#${item.reportId}` : '';
    const label = title ? `${title} ${reportId}`.trim() : reportId || 'Past report';
    const score =
      Number.isFinite(Number(item?.score)) ? Number(item.score).toFixed(2) : '';
    const snippet = String(item?.snippet || '').trim().slice(0, 1200);
    return `${index + 1}) ${label}${score ? ` (score ${score})` : ''}\n${snippet}`;
  });

  return blocks.join('\n\n---\n\n');
};

const runWorkflow = async (agent, traceName, workflowId, inputText, historyContext) => {
  return withTrace(traceName, async () => {
    const promptText = historyContext
      ? `Relevant context from your past Cruxlens reports:\n${historyContext}\n\n${inputText}`
      : inputText;

    const conversationHistory = [
      { role: 'user', content: [{ type: 'input_text', text: promptText }] },
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        ...(workflowId ? { workflow_id: workflowId } : {}),
      },
    });

    try {
      const result = await runner.run(agent, [...conversationHistory]);

      if (!result?.finalOutput) {
        throw new Error('Agent result is undefined');
      }

      conversationHistory.push(...result.newItems.map((item) => item.rawItem));

      return result.finalOutput;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Agent run failed (${agent.name}) [${traceName}]:`, error);
      const wrapped = new Error(`Agent run failed (${agent.name}): ${message}`);
      wrapped.cause = error;
      throw wrapped;
    }
  });
};

const runFourBallWorkflow = (planText, historyContext) =>
  runWorkflow(
    fourBallAgent,
    '4-ball',
    'wf_694aa129199c8190afff8e331daed50a065aa5e5892c761c',
    `Business plan:\n${planText}`,
    historyContext
  );

const runCruxWorkflow = (planText, historyContext) =>
  runWorkflow(
    cruxAgent,
    'The Crux',
    'wf_694aa7e792588190a9126dfe39052c1e017fca81ffe95065',
    `Business plan:\n${planText}`,
    historyContext
  );

const runExtendedWorkflow = (inputText, historyContext) =>
  runWorkflow(extendedAgent, 'Pages 5,6', 'pages-5-6', inputText, historyContext);

const runRumeltGuidepostsWorkflow = (inputText, historyContext) =>
  runWorkflow(
    rumeltGuidepostsAgent,
    'Rumelt’s 5',
    'wf_695fbfe2ef7c819095ccc1da990beb15096e9a6a43a72675',
    inputText,
    historyContext
  );

const runBusinessModelPatternWorkflow = (inputText, historyContext) =>
  runWorkflow(
    businessModelPatternAgent,
    'Business Model Pattern Identification',
    'wf_695fa949e7b081909b1395fefc515f1407abb36cb3df2651',
    inputText,
    historyContext
  );

const runCompanyNameWorkflow = (planText) =>
  runWorkflow(
    companyNameAgent,
    'Company Name',
    'company-name',
    `Business plan:\n${planText}`,
    ''
  );

const extractCompanyName = async (planText) => {
  const output = await runCompanyNameWorkflow(planText);
  return String(output?.company_name || '').trim();
};

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampScore = (value, min = 0, max = 10) =>
  Math.min(max, Math.max(min, value));

const countItems = (items) =>
  Array.isArray(items) ? items.filter((item) => String(item || '').trim()).length : 0;

const formatList = (items) =>
  (items || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('; ');

const asSentence = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const mapMoatStrength = (value) => {
  switch (value) {
    case 'high':
      return 9;
    case 'medium':
      return 7;
    case 'low':
      return 4;
    default:
      return 0;
  }
};

const buildFourBallSection = (output) => {
  const openingParagraph = String(output?.opening_paragraph || '').trim();
  const opportunity = output?.opportunity_space || {};
  const competitor = opportunity.competitor_oversight || {};
  const innovation = opportunity.innovation_core || {};
  const changing = opportunity.changing_circumstances || {};
  const reframing = opportunity.reframing || {};

  const blindSpotsText = formatList(competitor.blind_spots);
  const poorExecutionText = formatList(competitor.poor_executions);
  const competitorParts = [];
  if (blindSpotsText) {
    competitorParts.push(asSentence(`Blind spots: ${blindSpotsText}`));
  }
  if (poorExecutionText) {
    competitorParts.push(asSentence(`Poor executions: ${poorExecutionText}`));
  }

  const innovationParts = [];
  if (innovation.type) {
    innovationParts.push(asSentence(`Type: ${innovation.type}`));
  }
  if (innovation.description) {
    innovationParts.push(asSentence(innovation.description));
  }
  if (innovation.moat_strength) {
    innovationParts.push(asSentence(`Moat strength: ${innovation.moat_strength}`));
  }

  const changingParts = [];
  const regulatoryText = formatList(changing.regulatory_shifts);
  const techText = formatList(changing.tech_tailwinds);
  const behaviorText = formatList(changing.consumer_behavior);
  if (regulatoryText) {
    changingParts.push(asSentence(`Regulatory shifts: ${regulatoryText}`));
  }
  if (techText) {
    changingParts.push(asSentence(`Tech tailwinds: ${techText}`));
  }
  if (behaviorText) {
    changingParts.push(asSentence(`Consumer behavior: ${behaviorText}`));
  }

  const reframingParts = [];
  if (reframing.old_frame) {
    reframingParts.push(asSentence(`Old frame: ${reframing.old_frame}`));
  }
  if (reframing.new_frame) {
    reframingParts.push(asSentence(`New frame: ${reframing.new_frame}`));
  }

  const competitorScore = clampScore(
    (countItems(competitor.blind_spots) + countItems(competitor.poor_executions)) * 2
  );
  const innovationScore = clampScore(
    mapMoatStrength(innovation.moat_strength) ||
      (innovation.type || innovation.description ? 6 : 0)
  );
  const changingScore = clampScore(
    (countItems(changing.regulatory_shifts) +
      countItems(changing.tech_tailwinds) +
      countItems(changing.consumer_behavior)) *
      2
  );
  const reframingScore = clampScore(
    reframing.old_frame && reframing.new_frame ? 7 : reframing.old_frame || reframing.new_frame ? 4 : 0
  );

  const competitorContent = competitorParts.join(' ');
  const innovationContent = innovationParts.join(' ');
  const changingContent = changingParts.join(' ');
  const reframingContent = reframingParts.join(' ');

  const summaryTable = [
    {
      factor: 'Competitor oversight',
      type: 'strength',
      description: competitorContent,
    },
    {
      factor: 'Innovation core',
      type: 'strength',
      description: innovationContent,
    },
    {
      factor: 'Changing circumstances',
      type: 'strength',
      description: changingContent,
    },
    {
      factor: 'Reframing',
      type: 'strength',
      description: reframingContent,
    },
  ].filter((row) => row.description);

  return {
    opening_paragraph: openingParagraph,
    four_ball_model: {
      competitor_oversight: {
        content: competitorContent,
        score: competitorScore,
      },
      innovation: {
        content: innovationContent,
        score: innovationScore,
      },
      changing_circumstances: {
        content: changingContent,
        score: changingScore,
      },
      seeing_things_differently: {
        content: reframingContent,
        score: reframingScore,
      },
    },
    summary_table: summaryTable,
  };
};

const buildCruxSection = (output) => {
  const openingParagraph = String(output?.opening_paragraph || '').trim();
  const crux = output?.crux_analysis || {};
  const justification = crux.justification || {};
  const rawScore = Number.isFinite(Number(crux.solvability_score)) ?
    Number(crux.solvability_score) :
    null;
  const score = rawScore === null ? 0 : clampScore(Math.round(rawScore), 1, 10);

  return {
    cruxScore: score,
    pageData: {
      opening_paragraph: openingParagraph,
      bottleneck_identification: crux.distilled_bottleneck || '',
      leverage_point: crux.leverage_point || '',
      rumelt_justification: {
        cascade_logic: justification.cascade_logic || '',
        root_cause: justification.root_cause_identified || '',
        coherence: output?.checkpoint_solvability_confirmed
          ? 'Solvability checkpoint confirmed.'
          : '',
      },
    },
  };
};

const computeCoherenceScore = (fourBall, cruxScore) => {
  const scores = [
    toInt(fourBall?.competitor_oversight?.score),
    toInt(fourBall?.innovation?.score),
    toInt(fourBall?.changing_circumstances?.score),
    toInt(fourBall?.seeing_things_differently?.score),
  ].filter((score) => Number.isFinite(score));

  const fourAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const crux = Number.isFinite(cruxScore) ? cruxScore : 0;
  return clampScore(Math.round((fourAvg + crux) / 2));
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeHref = (href) => {
  const trimmed = String(href || '').trim();
  if (!trimmed) return '';
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith('https://') || lowered.startsWith('http://')) {
    return trimmed;
  }
  return '';
};

const renderTextWithLinks = (value) => {
  const text = String(value ?? '');
  if (!text) return '';

  const linkPattern = /\(\[([^\]]+)\]\(([^)]+)\)\)|\[([^\]]+)\]\(([^)]+)\)/g;
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(linkPattern)) {
    const index = typeof match.index === 'number' ? match.index : 0;
    result += escapeHtml(text.slice(lastIndex, index));

    const linkText = String(match[1] ?? match[3] ?? '').trim();
    const rawHref = String(match[2] ?? match[4] ?? '').trim();
    const safeHref = sanitizeHref(rawHref);

    if (linkText && safeHref) {
      result += `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`;
    } else {
      result += escapeHtml(match[0]);
    }

    lastIndex = index + match[0].length;
  }

  result += escapeHtml(text.slice(lastIndex));
  return result;
};

const renderList = (items) => {
  const safeItems = Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  if (!safeItems.length) {
    return '<p style="margin: 0 0 18px; font-size: 16px;">—</p>';
  }

  return `
    <ul style="margin: 0 0 18px; padding-left: 18px;">
      ${safeItems
        .map(
          (item) =>
            `<li style="margin: 0 0 8px; font-size: 16px;">${renderTextWithLinks(item)}</li>`
        )
        .join('')}
    </ul>
  `;
};

const renderReportHtml = (report) => {
  const metadata = report?.report_metadata || {};
  const pages = report?.pages || {};
  const page1 = pages.page_1_opportunity_space || {};
  const page2 = pages.page_2_the_crux || {};
  const page3 = pages.page_3_industry_dynamics || {};
  const page4 = pages.page_4_business_model || {};
  const page5 = Array.isArray(pages.page_5_reference_cases) ? pages.page_5_reference_cases : [];
  const page5OpeningParagraph = String(pages.page_5_opening_paragraph || '').trim();
  const page6 = pages.page_6_final_summary || {};

  const fourBall = page1.four_ball_model || {};
  const guideposts = Array.isArray(page3.guideposts) ? page3.guideposts : [];
  const rawPatterns = Array.isArray(page4.identified_patterns)
    ? page4.identified_patterns
    : [];
  const patternEntries = rawPatterns.map((pattern) =>
    typeof pattern === 'string' ? { pattern_name: pattern } : pattern
  );

  const analysisDate =
    metadata.analysis_date || new Date().toISOString().slice(0, 10);
  const score =
    Number.isFinite(metadata.overall_coherence_score) ?
      metadata.overall_coherence_score :
      0;

  const bodyTextStyle = 'font-size: 16px; line-height: 1.45; color: #000; margin: 0 0 18px;';
  const headerTitleStyle = 'font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: 700; margin: 0;';
  const sectionTitleStyle = 'font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 12px;';
  const smallMetaStyle = 'font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #000;';
  const pageMetaStyle = `${smallMetaStyle} margin: 0 0 18px;`;

  return `
    <div style="background: #ffffff; color: #000; font-family: Arial, Helvetica, sans-serif; line-height: 1.45; margin: 40px auto; max-width: 900px;">
      <section class="report-page">
        <header style="display: grid; grid-template-columns: 1fr 2fr;">
          <div style="padding: 24px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px;">Cruxlens</div>
          <div style="padding: 24px; display: flex; align-items: center; justify-content: center; ${headerTitleStyle}">&ldquo;${escapeHtml(metadata.case_name || 'Untitled Case')}&rdquo;</div>
        </header>
        <div style="padding: 40px 48px;">
          <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Coherence score: ${escapeHtml(score)} · Page 1/6</div>
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">Verdict:</span> ${renderTextWithLinks(metadata.verdict || '')}</p>

        <h2 style="${sectionTitleStyle}">Opportunity Space Analysis (4-Ball Model)</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page1.opening_paragraph || '—')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Competitor Oversight:</span> ${renderTextWithLinks(fourBall.competitor_oversight?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Innovation:</span> ${renderTextWithLinks(fourBall.innovation?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Changing Circumstances:</span> ${renderTextWithLinks(fourBall.changing_circumstances?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Seeing Things Differently:</span> ${renderTextWithLinks(fourBall.seeing_things_differently?.content || '')}</p>
        </div>
      </section>

      <section class="report-page" style="padding: 40px 48px;">
        <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Page 2/6</div>
        <h2 style="${sectionTitleStyle}">&ldquo;The Crux&rdquo; — Core Strategic Challenge (Rumelt)</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page2.opening_paragraph || '—')}</p>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Bottleneck:</span> ${renderTextWithLinks(page2.bottleneck_identification || '')}</p>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Leverage Point:</span> ${renderTextWithLinks(page2.leverage_point || '')}</p>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Cascade Logic:</span> ${renderTextWithLinks(page2.rumelt_justification?.cascade_logic || '')}</p>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Root Cause:</span> ${renderTextWithLinks(page2.rumelt_justification?.root_cause || '')}</p>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Coherence:</span> ${renderTextWithLinks(page2.rumelt_justification?.coherence || '')}</p>
      </section>

      <section class="report-page" style="padding: 40px 48px;">
        <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Page 3/6</div>
        <h2 style="${sectionTitleStyle}">Rumelt’s 5 Guideposts of Industry Dynamics</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page3.opening_paragraph || '—')}</p>
	        <div style="margin: 24px 0 18px;">
	          <table style="width: 100%; border-collapse: collapse; font-size: 14px; border-top: 1px solid #000; border-bottom: 1px solid #000;">
	            <thead>
	              <tr>
	                <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #000;">Guidepost</th>
	                <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #000;">Applies</th>
	                <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #000;">Impact</th>
	              </tr>
	            </thead>
	            <tbody>
	              ${guideposts
	                .map(
	                  (item) => `
	                <tr>
	                  <td style="padding: 8px 12px; border-bottom: 1px solid #000;">${renderTextWithLinks(item?.name || '')}</td>
	                  <td style="padding: 8px 12px; border-bottom: 1px solid #000;">${item?.applies ? 'Yes' : 'No'}</td>
	                  <td style="padding: 8px 12px; border-bottom: 1px solid #000;">${renderTextWithLinks(item?.impact || '')}</td>
	                </tr>`
	                )
	                .join('')}
	            </tbody>
	          </table>
	        </div>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic Summary:</span> ${renderTextWithLinks(page3.strategic_summary || '')}</p>
      </section>

      <section class="report-page" style="padding: 40px 48px;">
        <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Page 4/6</div>
        <h2 style="${sectionTitleStyle}">Business Model Pattern Identification</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page4.opening_paragraph || '—')}</p>
        ${patternEntries.length
          ? patternEntries
              .map(
                (pattern) => `
            <div class="avoid-page-break" style="margin: 18px 0 24px; padding: 18px;">
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700;">${escapeHtml(
                pattern?.pattern_name || ''
              )}</p>
              <p style="${bodyTextStyle}">${renderTextWithLinks(pattern?.description || '')}</p>
              <p style="${bodyTextStyle}"><span style="font-weight: 700;">Reasoning:</span> ${renderTextWithLinks(
                pattern?.reasoning?.logic || ''
              )}</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Fit indicators</p>
              ${renderList(pattern?.reasoning?.fit_indicators || [])}
            </div>`
              )
              .join('')
          : `<p style="${bodyTextStyle}">—</p>`}
      </section>

      <section class="report-page" style="padding: 40px 48px;">
        <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Page 5/6</div>
        <h2 style="${sectionTitleStyle}">Reference Cases and Strategic Improvement Ideas</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page5OpeningParagraph || '—')}</p>
	        ${page5
	          .map(
	            (item) => `
	          <div class="avoid-page-break" style="margin: 18px 0 24px; padding: 18px;">
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: 700;">${renderTextWithLinks(item?.case_name || '')}</p>
	            <p style="margin: 0 0 18px; font-size: 14px;"><span style="font-weight: 700;">Relevance:</span> ${renderTextWithLinks(item?.relevance_factor || '')}</p>
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Actionable learnings</p>
	            ${renderList(item?.actionable_learnings || [])}
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Improvement suggestions</p>
	            <p style="${bodyTextStyle}"><span style="font-weight: 700;">Brand / GTM:</span> ${renderTextWithLinks(item?.improvements?.brand_gtm || '')}</p>
	            <p style="${bodyTextStyle}"><span style="font-weight: 700;">Operational:</span> ${renderTextWithLinks(item?.improvements?.operational || '')}</p>
	            <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic pivot:</span> ${renderTextWithLinks(item?.improvements?.strategic_pivot || '')}</p>
	            <p style="${bodyTextStyle}"><span style="font-weight: 700;">Financing / partnerships:</span> ${renderTextWithLinks(item?.improvements?.financing || '')}</p>
	          </div>`
	          )
	          .join('')}
      </section>

      <section class="report-page" style="padding: 40px 48px;">
        <div style="${pageMetaStyle}">Cruxlens · ${escapeHtml(analysisDate)} · Page 6/6</div>
        <h2 style="${sectionTitleStyle}">Summary — What Works, What Needs Work</h2>
        <p style="${bodyTextStyle}">${renderTextWithLinks(page6.opening_paragraph || '—')}</p>
	        <div style="display: grid; grid-template-columns: 1fr; gap: 18px;">
	          <div>
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Strengths</p>
	            ${renderList(page6.strengths || [])}
	          </div>
	          <div>
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Weaknesses</p>
	            ${renderList(page6.weaknesses || [])}
	          </div>
	          <div>
	            <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Gaps</p>
	            ${renderList(page6.gaps || [])}
	          </div>
	        </div>
	        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic potential:</span> ${renderTextWithLinks(page6.strategic_potential || '')}</p>
	        <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700;">Next steps</p>
	        ${renderList(page6.next_steps || [])}
      </section>
	    </div>
	  `;
};

const generateReport = async (planText, { authUserId } = {}) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  let historyContext = '';
  if (authUserId) {
    try {
      const results = await searchUserVectorStore({
        authUserId,
        query: String(planText || '').slice(0, 8000),
        maxResults: 8,
      });
      historyContext = buildUserHistoryContext(results);
    } catch (error) {
      console.error('Vector store retrieval failed:', error);
    }
  }

  const caseNamePromise = extractCompanyName(planText);
  const [fourBallOutput, cruxOutput] = await Promise.all([
    runFourBallWorkflow(planText, historyContext),
    runCruxWorkflow(planText, historyContext),
  ]);

  const fourBallSection = buildFourBallSection(fourBallOutput);
  const cruxSection = buildCruxSection(cruxOutput);

  const emptyGuideposts = [
    { name: 'Rising Fixed Costs', applies: false, impact: '' },
    { name: 'Deregulation / New Rules', applies: false, impact: '' },
    { name: 'Predictable Biases in Competition', applies: false, impact: '' },
    { name: 'Incumbent Response Lags', applies: false, impact: '' },
    { name: 'Attractor States', applies: false, impact: '' },
  ];

  const normalizeGuideposts = (inputGuideposts) => {
    const items = Array.isArray(inputGuideposts) ? inputGuideposts : [];
    const normalizeKey = (value) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const pickMatch = (base, candidates) => {
      const baseKey = normalizeKey(base);
      for (const item of candidates) {
        const name = String(item?.name || '').trim();
        const key = normalizeKey(name);
        if (!key) continue;
        if (key === baseKey) return item;
        if (key.includes(baseKey) || baseKey.includes(key)) return item;
        if (baseKey.includes('predictable biases') && key.includes('predictable biases')) {
          return item;
        }
        if (baseKey.includes('deregulation') && (key.includes('deregulation') || key.includes('new rules'))) {
          return item;
        }
        if (baseKey.includes('attractor') && key.includes('attractor')) {
          return item;
        }
        if (baseKey.includes('incumbent response') && key.includes('incumbent') && key.includes('response')) {
          return item;
        }
        if (baseKey.includes('rising fixed costs') && key.includes('fixed') && key.includes('cost')) {
          return item;
        }
      }
      return null;
    };

    return emptyGuideposts.map((base) => {
      const match = pickMatch(base.name, items);
      return {
        name: base.name,
        applies: Boolean(match?.applies),
        impact: String(match?.impact || '').trim(),
      };
    });
  };

  const rumeltInput = [
    `Business plan:\n${planText}`,
    '',
    'Opportunity Space (Page 1 JSON):',
    JSON.stringify(fourBallSection, null, 2),
    '',
    'The Crux (Page 2 JSON):',
    JSON.stringify(cruxSection.pageData, null, 2),
  ].join('\n');

  const extendedInput = [
    `Business plan:\n${planText}`,
    '',
    'Page 1 JSON (Opportunity Space Analysis):',
    JSON.stringify(fourBallSection, null, 2),
    '',
    'Page 2 JSON (The Crux):',
    JSON.stringify(cruxSection.pageData, null, 2),
  ].join('\n');

  const businessModelInput = [
    `Business plan:\n${planText}`,
    '',
    'Opportunity Space (Page 1 JSON):',
    JSON.stringify(fourBallSection, null, 2),
    '',
    'The Crux (Page 2 JSON):',
    JSON.stringify(cruxSection.pageData, null, 2),
  ].join('\n');

  const [rumeltResult, extendedResult, businessModelResult] =
    await Promise.allSettled([
      runRumeltGuidepostsWorkflow(rumeltInput, historyContext),
      runExtendedWorkflow(extendedInput, historyContext),
      runBusinessModelPatternWorkflow(businessModelInput, historyContext),
    ]);

  const rumeltOutput =
    rumeltResult.status === 'fulfilled' ? rumeltResult.value : null;
  if (rumeltResult.status === 'rejected') {
    console.error('Rumelt guideposts analysis failed:', rumeltResult.reason);
  }

  const extendedOutput =
    extendedResult.status === 'fulfilled' ? extendedResult.value : null;
  if (extendedResult.status === 'rejected') {
    console.error('Extended analysis (pages 5–6) failed:', extendedResult.reason);
  }

  const businessModelOutput =
    businessModelResult.status === 'fulfilled' ? businessModelResult.value : null;
  if (businessModelResult.status === 'rejected') {
    console.error('Business model pattern analysis failed:', businessModelResult.reason);
  }

  const caseName = (await caseNamePromise) || 'Untitled Case';
  const solvabilityNote = cruxSection.cruxScore
    ? `Solvability score: ${cruxSection.cruxScore}/10.`
    : '';
  const extendedVerdict = String(extendedOutput?.verdict || '').trim();
  const verdict = [extendedVerdict, solvabilityNote].filter(Boolean).join(' ');
  const overallCoherenceScore = computeCoherenceScore(
    fourBallSection.four_ball_model,
    cruxSection.cruxScore
  );

  const page3FromAgent = rumeltOutput || null;
  const page4FromAgent = businessModelOutput || null;
  const page5FromAgent = extendedOutput?.page_5_reference_cases || null;
  const page5OpeningParagraph = String(extendedOutput?.page_5_opening_paragraph || '').trim();
  const page6FromAgent = extendedOutput?.page_6_final_summary || null;

  const reportJson = {
    report_metadata: {
      case_name: caseName,
      analysis_date: new Date().toISOString().slice(0, 10),
      overall_coherence_score: overallCoherenceScore,
      verdict,
    },
    pages: {
      page_1_opportunity_space: fourBallSection,
      page_2_the_crux: cruxSection.pageData,
      page_3_industry_dynamics: {
        opening_paragraph: String(page3FromAgent?.opening_paragraph || '').trim(),
        guideposts: normalizeGuideposts(
          Array.isArray(page3FromAgent?.guideposts)
            ? page3FromAgent.guideposts.map((item) => {
                const relevant = item?.relevant;
                const applies =
                  typeof relevant === 'boolean' ?
                    relevant :
                    String(relevant || '').toLowerCase() === 'yes';
                return {
                  name: item?.guidepost || '',
                  applies,
                  impact: item?.explanation || '',
                };
              })
            : []
        ),
        strategic_summary: (() => {
          const relevantNames = Array.isArray(page3FromAgent?.guideposts)
            ? page3FromAgent.guideposts
                .filter(
                  (item) => String(item?.relevant || '').toLowerCase() === 'yes'
                )
                .map((item) => String(item?.guidepost || '').trim())
                .filter(Boolean)
            : [];

          if (relevantNames.length) {
            return `Relevant guideposts: ${relevantNames.join(', ')}.`;
          }
          return 'No guideposts are materially relevant based on current information.';
        })(),
      },
      page_4_business_model: {
        opening_paragraph: String(page4FromAgent?.opening_paragraph || '').trim(),
        identified_patterns: Array.isArray(page4FromAgent?.identified_patterns)
          ? page4FromAgent.identified_patterns
              .map((pattern) => ({
                pattern_name: String(pattern?.pattern_name || '').trim(),
                description: String(pattern?.description || '').trim(),
                reasoning: {
                  logic: String(pattern?.reasoning?.logic || '').trim(),
                  fit_indicators: Array.isArray(pattern?.reasoning?.fit_indicators)
                    ? pattern.reasoning.fit_indicators
                        .map((item) => String(item || '').trim())
                        .filter(Boolean)
                    : [],
                },
              }))
              .filter((pattern) => pattern.pattern_name)
          : [],
      },
      page_5_opening_paragraph: page5OpeningParagraph,
      page_5_reference_cases: Array.isArray(page5FromAgent)
        ? page5FromAgent
            .map((item) => ({
              case_name: String(item?.case_name || '').trim(),
              relevance_factor: String(item?.relevance_factor || '').trim(),
              actionable_learnings: Array.isArray(item?.actionable_learnings)
                ? item.actionable_learnings
                    .map((learning) => String(learning || '').trim())
                    .filter(Boolean)
                : [],
              improvements: {
                brand_gtm: String(item?.improvements?.brand_gtm || '').trim(),
                operational: String(item?.improvements?.operational || '').trim(),
                strategic_pivot: String(item?.improvements?.strategic_pivot || '').trim(),
                financing: String(item?.improvements?.financing || '').trim(),
              },
            }))
            .filter((item) => item.case_name)
        : [],
      page_6_final_summary: {
        opening_paragraph: String(page6FromAgent?.opening_paragraph || '').trim(),
        strengths: Array.isArray(page6FromAgent?.strengths)
          ? page6FromAgent.strengths
              .map((item) => String(item || '').trim())
              .filter(Boolean)
          : [],
        weaknesses: Array.isArray(page6FromAgent?.weaknesses)
          ? page6FromAgent.weaknesses
              .map((item) => String(item || '').trim())
              .filter(Boolean)
          : [],
        gaps: Array.isArray(page6FromAgent?.gaps)
          ? page6FromAgent.gaps
              .map((item) => String(item || '').trim())
              .filter(Boolean)
          : [],
        strategic_potential: String(page6FromAgent?.strategic_potential || '').trim(),
        next_steps: Array.isArray(page6FromAgent?.next_steps)
          ? page6FromAgent.next_steps
              .map((item) => String(item || '').trim())
              .filter(Boolean)
          : [],
      },
    },
  };

  const title = reportJson.report_metadata.case_name || 'Report';
  const reportHtml = renderReportHtml(reportJson);

  return { reportJson, reportHtml, title };
};

export { generateReport, parseReportJson, renderReportHtml, extractCompanyName };
