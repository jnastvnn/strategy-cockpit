import {
  Agent,
  Runner,
  setDefaultModelProvider,
  withTrace,
} from '../../node_modules/@openai/agents-openai/node_modules/@openai/agents-core/dist/index.mjs';
import {
  OpenAIProvider,
  setDefaultOpenAITracingExporter,
  webSearchTool,
} from '@openai/agents-openai';

// Ensure all agent runs share the same provider instance (avoids trace context mismatches)
setDefaultModelProvider(new OpenAIProvider());
setDefaultOpenAITracingExporter();

const webSearchPreview = webSearchTool({
  searchContextSize: 'medium',
  userLocation: {
    type: 'approximate',
  },
});

const fourBallModelOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['agent', 'opportunity_space', 'checkpoint_validation'],
    properties: {
      agent: {
        type: 'string',
        description: 'The agent analyzing the market opportunity space.',
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
    required: ['agent', 'crux_analysis', 'checkpoint_solvability_confirmed'],
    properties: {
      agent: {
        type: 'string',
        description: 'The name of the agent performing the analysis.',
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

const fourBallAgent = new Agent({
  name: '4-Ball Model',
  instructions: `You are the Market Scout. Your task is to analyze the business case through the 4-Ball Model. You must validate the "Opportunity Space" by checking for:
Competitor Oversight: What are incumbents ignoring?
Innovation: What is the proprietary "secret sauce" (tech, process, or insight)?
Changing Circumstances: What tailwinds (regulation, tech shifts, social trends) make this possible now?
Seeing Differently: How is this reframing the problem?

You take a business plan as a input and may use the web search.`,
  model: 'gpt-5-nano',
  tools: [webSearchPreview],
  outputType: fourBallModelOutputType,
  modelSettings: {
    reasoning: {
      effort: 'medium',
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

Use the provided business plan and web search.`,
  model: 'gpt-5-nano',
  tools: [webSearchPreview],
  outputType: cruxOutputType,
  modelSettings: {
    reasoning: {
      effort: 'high',
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

const runWorkflow = async (agent, traceName, workflowId, planText) => {
  return withTrace(traceName, async () => {
    const conversationHistory = [
      { role: 'user', content: [{ type: 'input_text', text: planText }] },
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: workflowId,
      },
    });
    const result = await runner.run(agent, [...conversationHistory]);

    if (!result?.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    conversationHistory.push(...result.newItems.map((item) => item.rawItem));

    return result.finalOutput;
  });
};

const runFourBallWorkflow = (planText) =>
  runWorkflow(
    fourBallAgent,
    '4-ball',
    'wf_694aa129199c8190afff8e331daed50a065aa5e5892c761c',
    planText
  );

const runCruxWorkflow = (planText) =>
  runWorkflow(
    cruxAgent,
    'The Crux',
    'wf_694aa7e792588190a9126dfe39052c1e017fca81ffe95065',
    planText
  );

const deriveCaseName = (planText) => {
  if (!planText) return 'Untitled Case';
  const line = planText.split('\n').find((text) => text.trim().length > 0);
  return (line || 'Untitled Case').trim().slice(0, 80);
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
  const crux = output?.crux_analysis || {};
  const justification = crux.justification || {};
  const rawScore = Number.isFinite(Number(crux.solvability_score)) ?
    Number(crux.solvability_score) :
    null;
  const score = rawScore === null ? 0 : clampScore(Math.round(rawScore), 1, 10);

  return {
    cruxScore: score,
    pageData: {
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

const renderReportHtml = (report) => {
  const metadata = report?.report_metadata || {};
  const pages = report?.pages || {};
  const page1 = pages.page_1_opportunity_space || {};
  const page2 = pages.page_2_the_crux || {};

  const fourBall = page1.four_ball_model || {};
  const summaryTable = page1.summary_table || [];

  const analysisDate =
    metadata.analysis_date || new Date().toISOString().slice(0, 10);
  const score =
    Number.isFinite(metadata.overall_coherence_score) ?
      metadata.overall_coherence_score :
      0;

  const bodyTextStyle = 'font-size: 16px; line-height: 1.45; color: #000; margin: 0 0 18px;';
  const headerTitleStyle = 'font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: 700; margin: 0;';
  const sectionTitleStyle = 'font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 12px;';
  const subsectionTitleStyle = 'font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700; margin: 36px 0 12px;';
  const smallMetaStyle = 'font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #000;';

  return `
    <div style="background: #ffffff; color: #000; font-family: Georgia, 'Times New Roman', serif; line-height: 1.45; margin: 40px auto; max-width: 900px; border: 1px solid #000;">
      <header style="display: grid; grid-template-columns: 1fr 2fr; border-bottom: 1px solid #000;">
        <div style="padding: 24px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 22px; border-right: 1px solid #000;">Cruxlens</div>
        <div style="padding: 24px; display: flex; align-items: center; justify-content: center; ${headerTitleStyle}">&ldquo;${escapeHtml(metadata.case_name || 'Untitled Case')}&rdquo;</div>
      </header>

      <section style="padding: 40px 48px;">
        <div style="display: flex; flex-wrap: wrap; gap: 24px; ${smallMetaStyle}">
          <span>${escapeHtml(analysisDate)}</span>
          <span>Coherence score: ${escapeHtml(score)}</span>
        </div>
        <p style="${bodyTextStyle} margin-top: 18px;"><span style="font-weight: 700;">Verdict:</span> ${escapeHtml(metadata.verdict || '')}</p>

        <h2 style="${sectionTitleStyle}">Opportunity Space Analysis (4-Ball Model)</h2>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Competitor Oversight:</span> ${escapeHtml(fourBall.competitor_oversight?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Innovation:</span> ${escapeHtml(fourBall.innovation?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Changing Circumstances:</span> ${escapeHtml(fourBall.changing_circumstances?.content || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Seeing Things Differently:</span> ${escapeHtml(fourBall.seeing_things_differently?.content || '')}</p>

        <div style="margin: 24px 0 32px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; border: 1px solid #000;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px 12px; border: 1px solid #000;">Factor</th>
                <th style="text-align: left; padding: 8px 12px; border: 1px solid #000;">Type</th>
                <th style="text-align: left; padding: 8px 12px; border: 1px solid #000;">Description</th>
              </tr>
            </thead>
            <tbody>
              ${summaryTable
                .map(
                  (row) => `
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #000;">${escapeHtml(row.factor || '')}</td>
                  <td style="padding: 8px 12px; border: 1px solid #000;">${escapeHtml(row.type || '')}</td>
                  <td style="padding: 8px 12px; border: 1px solid #000;">${escapeHtml(row.description || '')}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <h3 style="${subsectionTitleStyle}">&ldquo;The Crux&rdquo; — Core Strategic Challenge (Rumelt)</h3>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Bottleneck:</span> ${escapeHtml(page2.bottleneck_identification || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Leverage Point:</span> ${escapeHtml(page2.leverage_point || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Cascade Logic:</span> ${escapeHtml(page2.rumelt_justification?.cascade_logic || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Root Cause:</span> ${escapeHtml(page2.rumelt_justification?.root_cause || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Coherence:</span> ${escapeHtml(page2.rumelt_justification?.coherence || '')}</p>

        <div style="height: 60px;"></div>
      </section>
    </div>
  `;
};

const generateReport = async (planText) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const fourBallOutput = await runFourBallWorkflow(planText);
  const cruxOutput = await runCruxWorkflow(planText);

  const fourBallSection = buildFourBallSection(fourBallOutput);
  const cruxSection = buildCruxSection(cruxOutput);

  const caseName = deriveCaseName(planText);
  const verdict = cruxSection.cruxScore
    ? `Solvability score: ${cruxSection.cruxScore}/10.`
    : '';
  const overallCoherenceScore = computeCoherenceScore(
    fourBallSection.four_ball_model,
    cruxSection.cruxScore
  );

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
        guideposts: [
          { name: 'Rising Fixed Costs', applies: false, impact: '' },
          { name: 'Deregulation / New Rules', applies: false, impact: '' },
          { name: 'Predictable Biases', applies: false, impact: '' },
          { name: 'Incumbent Response Lags', applies: false, impact: '' },
          { name: 'Attractor States', applies: false, impact: '' },
        ],
        strategic_summary: '',
      },
      page_4_business_model: {
        identified_patterns: [],
        rationale: {
          opportunity_alignment: '',
          crux_solution: '',
          scalability: '',
        },
        canvas_preview: {
          value_proposition: '',
          revenue_streams: '',
          key_partners: '',
        },
      },
      page_5_reference_cases: [],
      page_6_final_summary: {
        strengths: [],
        weaknesses: [],
        gaps: [],
        strategic_potential: '',
        next_steps: [],
      },
    },
  };

  const title = reportJson.report_metadata.case_name || 'Report';
  const reportHtml = renderReportHtml(reportJson);

  return { reportJson, reportHtml, title };
};

export { generateReport, parseReportJson, renderReportHtml };
