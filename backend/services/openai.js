const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const SYSTEM_PROMPT = `You are an expert Senior Strategic Business Analyst and Venture Consultant. Your task is to review business plans, pitch decks, or business descriptions provided by the user and conduct a rigorous, "Standardised Business Plan Analysis."

Objective:
Produce a deep, structured analysis that balances academic rigor (Rumelt, Strategyzer) with investor-friendly storytelling. The output must strictly follow the JSON schema provided below.

Tone and Style:
- Professional, direct, constructive.
- Structured and digestible for founders and investors.

Output Rules:
- Return ONLY valid JSON matching the schema exactly.
- Do not include markdown, code fences, or commentary.
- Use ISO-8601 date strings for analysis_date (YYYY-MM-DD).
- Use integers for scores.
- Keep fields concise and specific.

JSON Schema (must match):
{
  "report_metadata": {
    "case_name": "string",
    "analysis_date": "string",
    "overall_coherence_score": 0,
    "verdict": "string"
  },
  "pages": {
    "page_1_opportunity_space": {
      "four_ball_model": {
        "competitor_oversight": { "content": "string", "score": 0 },
        "innovation": { "content": "string", "score": 0 },
        "changing_circumstances": { "content": "string", "score": 0 },
        "seeing_things_differently": { "content": "string", "score": 0 }
      },
      "summary_table": [
        { "factor": "string", "type": "strength | blind_spot", "description": "string" }
      ]
    },
    "page_2_the_crux": {
      "bottleneck_identification": "string",
      "leverage_point": "string",
      "rumelt_justification": {
        "cascade_logic": "string",
        "root_cause": "string",
        "coherence": "string"
      }
    },
    "page_3_industry_dynamics": {
      "guideposts": [
        { "name": "Rising Fixed Costs", "applies": "boolean", "impact": "string" },
        { "name": "Deregulation / New Rules", "applies": "boolean", "impact": "string" },
        { "name": "Predictable Biases", "applies": "boolean", "impact": "string" },
        { "name": "Incumbent Response Lags", "applies": "boolean", "impact": "string" },
        { "name": "Attractor States", "applies": "boolean", "impact": "string" }
      ],
      "strategic_summary": "string"
    },
    "page_4_business_model": {
      "identified_patterns": ["string"],
      "rationale": {
        "opportunity_alignment": "string",
        "crux_solution": "string",
        "scalability": "string"
      },
      "canvas_preview": {
        "value_proposition": "string",
        "revenue_streams": "string",
        "key_partners": "string"
      }
    },
    "page_5_reference_cases": [
      {
        "case_name": "string",
        "relevance_factor": "string",
        "actionable_learnings": ["string"],
        "improvements": {
          "brand_gtm": "string",
          "operational": "string",
          "strategic_pivot": "string",
          "financing": "string"
        }
      }
    ],
    "page_6_final_summary": {
      "strengths": ["string"],
      "weaknesses": ["string"],
      "gaps": ["string"],
      "strategic_potential": "string",
      "next_steps": ["string"]
    }
  }
}`;

const extractOutputText = (data) => {
  if (data?.output_text) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const text = data.output
      .flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('')
      .trim();
    return text;
  }

  return '';
};

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const listItems = (items, style) =>
  (items || [])
    .map((item) => `<li style="${style}">${escapeHtml(item)}</li>`)
    .join('');

const renderReportHtml = (report) => {
  const metadata = report?.report_metadata || {};
  const pages = report?.pages || {};
  const page1 = pages.page_1_opportunity_space || {};
  const page2 = pages.page_2_the_crux || {};
  const page3 = pages.page_3_industry_dynamics || {};
  const page4 = pages.page_4_business_model || {};
  const page5 = pages.page_5_reference_cases || [];
  const page6 = pages.page_6_final_summary || {};

  const fourBall = page1.four_ball_model || {};
  const summaryTable = page1.summary_table || [];
  const guideposts = page3.guideposts || [];
  const patterns = page4.identified_patterns || [];

  const analysisDate =
    metadata.analysis_date || new Date().toISOString().slice(0, 10);
  const score =
    Number.isFinite(metadata.overall_coherence_score) ?
      metadata.overall_coherence_score :
      0;

  const listItemStyle = 'margin: 0 0 0.4rem; color: #000; font-size: 15px; line-height: 1.55;';
  const bodyTextStyle = 'font-size: 16px; line-height: 1.45; color: #000; margin: 0 0 18px;';
  const headerTitleStyle = 'font-family: Inter, Arial, sans-serif; font-size: 36px; font-weight: 700; margin: 0;';
  const sectionTitleStyle = 'font-family: Inter, Arial, sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 12px;';
  const subsectionTitleStyle = 'font-family: Inter, Arial, sans-serif; font-size: 22px; font-weight: 700; margin: 36px 0 12px;';
  const smallMetaStyle = 'font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #000;';

  return `
    <div style="background: #ffffff; color: #000; font-family: Inter, Arial, sans-serif; line-height: 1.45; margin: 40px auto; max-width: 900px; border: 1px solid #000;">
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
        <p style="${bodyTextStyle}">${escapeHtml(fourBall.competitor_oversight?.content || '')}</p>
        <p style="${bodyTextStyle}">${escapeHtml(fourBall.innovation?.content || '')}</p>
        <p style="${bodyTextStyle}">${escapeHtml(fourBall.changing_circumstances?.content || '')}</p>
        <p style="${bodyTextStyle}">${escapeHtml(fourBall.seeing_things_differently?.content || '')}</p>

        <h3 style="${subsectionTitleStyle}">&ldquo;The Crux&rdquo; — Core Strategic Challenge (Rumelt)</h3>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Bottleneck:</span> ${escapeHtml(page2.bottleneck_identification || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Leverage Point:</span> ${escapeHtml(page2.leverage_point || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Cascade Logic:</span> ${escapeHtml(page2.rumelt_justification?.cascade_logic || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Root Cause:</span> ${escapeHtml(page2.rumelt_justification?.root_cause || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Coherence:</span> ${escapeHtml(page2.rumelt_justification?.coherence || '')}</p>

        <h3 style="${subsectionTitleStyle}">Rumelt’s 5 Guideposts of Industry Dynamics</h3>
        ${guideposts
          .map(
            (item) => `
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">${escapeHtml(item.name || '')}:</span> ${escapeHtml(item.impact || '')}</p>`
          )
          .join('')}
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic Summary:</span> ${escapeHtml(page3.strategic_summary || '')}</p>

        <h3 style="${subsectionTitleStyle}">Business Model Pattern Identification</h3>
        <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
          ${listItems(patterns, listItemStyle)}
        </ul>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Opportunity Alignment:</span> ${escapeHtml(page4.rationale?.opportunity_alignment || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Crux Solution:</span> ${escapeHtml(page4.rationale?.crux_solution || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Scalability:</span> ${escapeHtml(page4.rationale?.scalability || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Value Proposition:</span> ${escapeHtml(page4.canvas_preview?.value_proposition || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Revenue Streams:</span> ${escapeHtml(page4.canvas_preview?.revenue_streams || '')}</p>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Key Partners:</span> ${escapeHtml(page4.canvas_preview?.key_partners || '')}</p>

        <h3 style="${subsectionTitleStyle}">Reference Cases and Strategic Improvement Ideas</h3>
        ${page5
          .map(
            (item) => `
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">${escapeHtml(item.case_name || '')}:</span> ${escapeHtml(item.relevance_factor || '')}</p>
          <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
            ${listItems(item.actionable_learnings || [], listItemStyle)}
          </ul>
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">Brand / GTM:</span> ${escapeHtml(item.improvements?.brand_gtm || '')}</p>
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">Operational:</span> ${escapeHtml(item.improvements?.operational || '')}</p>
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic Pivot:</span> ${escapeHtml(item.improvements?.strategic_pivot || '')}</p>
          <p style="${bodyTextStyle}"><span style="font-weight: 700;">Financing:</span> ${escapeHtml(item.improvements?.financing || '')}</p>
          `
          )
          .join('')}

        <div style="border-top: 1px solid #000; margin: 40px -48px;"></div>

        <div style="font-family: Inter, Arial, sans-serif; font-size: 26px; font-weight: 700; margin-bottom: 24px;">
          Summary — What Works, What Needs Work
        </div>
        <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
          ${listItems(page6.strengths || [], listItemStyle)}
        </ul>
        <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
          ${listItems(page6.weaknesses || [], listItemStyle)}
        </ul>
        <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
          ${listItems(page6.gaps || [], listItemStyle)}
        </ul>
        <p style="${bodyTextStyle}"><span style="font-weight: 700;">Strategic Potential:</span> ${escapeHtml(page6.strategic_potential || '')}</p>
        <ul style="margin: 0 0 18px 18px; padding: 0; list-style: disc;">
          ${listItems(page6.next_steps || [], listItemStyle)}
        </ul>

        <div style="height: 60px;"></div>
      </section>
    </div>
  `;
};

const generateReport = async (planText) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Business plan:\n${planText}`,
        },
      ],
      max_output_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new Error('OpenAI returned an empty response');
  }

  const reportJson = parseReportJson(outputText);
  const title = reportJson?.report_metadata?.case_name || 'Report';
  const reportHtml = renderReportHtml(reportJson);

  return { reportJson, reportHtml, title };
};

module.exports = { generateReport, parseReportJson, renderReportHtml };
