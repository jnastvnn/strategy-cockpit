import { pool } from '../db/index.js';

const OPENAI_API_BASE_URL =
  process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
const MAX_VECTOR_QUERY_LENGTH = 4096;

class OpenAIRequestError extends Error {
  constructor(message, { status, requestId, data } = {}) {
    super(message);
    this.name = 'OpenAIRequestError';
    this.status = status;
    this.requestId = requestId;
    this.data = data;
  }
}

const parseJsonSafely = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const clampQuery = (query) => {
  const text = String(query || '').trim();
  if (!text) return '';
  return text.length > MAX_VECTOR_QUERY_LENGTH
    ? text.slice(0, MAX_VECTOR_QUERY_LENGTH)
    : text;
};

const openaiFetchJson = async (path, { method = 'GET', headers, body } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const url = `${OPENAI_API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(headers || {}),
    },
    body,
  });

  if (response.ok) {
    return await parseJsonSafely(response);
  }

  const data = await parseJsonSafely(response);
  const requestId =
    response.headers.get('x-request-id') || response.headers.get('x-request_id');
  const message =
    data?.error?.message ||
    `OpenAI API error (${response.status}) calling ${method} ${path}`;

  const error = new OpenAIRequestError(message, {
    status: response.status,
    requestId,
    data,
  });
  console.error(
    `OpenAI API request failed: ${method} ${path} status=${response.status} requestId=${requestId || 'n/a'}`
  );
  throw error;
};

const openaiFetchJsonBeta = (path, options) =>
  openaiFetchJson(path, {
    ...(options || {}),
    headers: {
      'OpenAI-Beta': 'assistants=v2',
      ...(options?.headers || {}),
    },
  });

const isNotFoundError = (error) =>
  error instanceof OpenAIRequestError && error.status === 404;

const buildReportIndexText = ({ reportId, title, planText, reportJson }) => {
  const safeTitle = String(title || '').trim() || 'Untitled report';
  const pages = reportJson?.pages || {};
  const fourBall = pages.page_1_opportunity_space?.four_ball_model || {};
  const crux = pages.page_2_the_crux || {};
  const page3 = pages.page_3_industry_dynamics || {};
  const page4 = pages.page_4_business_model || {};
  const page5 = Array.isArray(pages.page_5_reference_cases) ? pages.page_5_reference_cases : [];
  const page6 = pages.page_6_final_summary || {};
  const metadata = reportJson?.report_metadata || {};

  const lines = [];
  lines.push('Cruxlens — Report Context');
  lines.push(`Report ID: ${reportId}`);
  lines.push(`Title: ${safeTitle}`);
  if (metadata.analysis_date) {
    lines.push(`Analysis date: ${metadata.analysis_date}`);
  }
  if (metadata.verdict) {
    lines.push(`Verdict: ${metadata.verdict}`);
  }
  lines.push('');
  lines.push('Opportunity Space Analysis (4-Ball Model)');
  lines.push(`- Competitor Oversight: ${fourBall.competitor_oversight?.content || ''}`);
  lines.push(`- Innovation: ${fourBall.innovation?.content || ''}`);
  lines.push(`- Changing Circumstances: ${fourBall.changing_circumstances?.content || ''}`);
  lines.push(`- Seeing Things Differently: ${fourBall.seeing_things_differently?.content || ''}`);
  lines.push('');
  lines.push('“The Crux” — Core Strategic Challenge (Rumelt)');
  lines.push(`- Bottleneck: ${crux.bottleneck_identification || ''}`);
  lines.push(`- Leverage Point: ${crux.leverage_point || ''}`);
  lines.push(`- Cascade Logic: ${crux.rumelt_justification?.cascade_logic || ''}`);
  lines.push(`- Root Cause: ${crux.rumelt_justification?.root_cause || ''}`);
  lines.push('');
  lines.push('Rumelt’s 5 Guideposts of Industry Dynamics');
  const guideposts = Array.isArray(page3.guideposts) ? page3.guideposts : [];
  for (const item of guideposts) {
    const name = String(item?.name || '').trim();
    if (!name) continue;
    const applies = item?.applies ? 'Applies' : 'Not material';
    const impact = String(item?.impact || '').trim();
    lines.push(`- ${name} (${applies}): ${impact}`);
  }
  if (page3.strategic_summary) {
    lines.push(`Strategic summary: ${page3.strategic_summary}`);
  }
  lines.push('');
  lines.push('Business Model Pattern Identification');
  if (page4.opening_paragraph) {
    lines.push(`Overview: ${page4.opening_paragraph}`);
  }
  const patterns = Array.isArray(page4.identified_patterns) ? page4.identified_patterns : [];
  patterns.slice(0, 3).forEach((pattern, index) => {
    const name = String(
      typeof pattern === 'string' ? pattern : pattern?.pattern_name || ''
    ).trim();
    if (!name) return;
    lines.push(`${index + 1}) ${name}`);
    const description = String(pattern?.description || '').trim();
    if (description) {
      lines.push(`   Description: ${description}`);
    }
    const logic = String(pattern?.reasoning?.logic || '').trim();
    if (logic) {
      lines.push(`   Reasoning: ${logic}`);
    }
    const indicators = Array.isArray(pattern?.reasoning?.fit_indicators)
      ? pattern.reasoning.fit_indicators.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    if (indicators.length) {
      lines.push(`   Fit indicators: ${indicators.join('; ')}`);
    }
  });
  if (page5.length) {
    lines.push('');
    lines.push('Reference Cases and Strategic Improvement Ideas');
    page5.slice(0, 4).forEach((item, index) => {
      const caseName = String(item?.case_name || '').trim();
      if (!caseName) return;
      const relevance = String(item?.relevance_factor || '').trim();
      lines.push(`${index + 1}) ${caseName}${relevance ? ` — ${relevance}` : ''}`);
      const learnings = Array.isArray(item?.actionable_learnings)
        ? item.actionable_learnings.map((v) => String(v || '').trim()).filter(Boolean)
        : [];
      if (learnings.length) {
        lines.push(`   Learnings: ${learnings.join('; ')}`);
      }
      if (item?.improvements) {
        const brand = String(item.improvements.brand_gtm || '').trim();
        const operational = String(item.improvements.operational || '').trim();
        const pivot = String(item.improvements.strategic_pivot || '').trim();
        const financing = String(item.improvements.financing || '').trim();
        if (brand) lines.push(`   Brand/GTM: ${brand}`);
        if (operational) lines.push(`   Operational: ${operational}`);
        if (pivot) lines.push(`   Strategic pivot: ${pivot}`);
        if (financing) lines.push(`   Financing/partnerships: ${financing}`);
      }
    });
  }
  lines.push('');
  lines.push('Summary — What Works, What Needs Work');
  const strengths = Array.isArray(page6.strengths)
    ? page6.strengths.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  const weaknesses = Array.isArray(page6.weaknesses)
    ? page6.weaknesses.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  const gaps = Array.isArray(page6.gaps)
    ? page6.gaps.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  if (strengths.length) lines.push(`Strengths: ${strengths.join('; ')}`);
  if (weaknesses.length) lines.push(`Weaknesses: ${weaknesses.join('; ')}`);
  if (gaps.length) lines.push(`Gaps: ${gaps.join('; ')}`);
  if (page6.strategic_potential) lines.push(`Strategic potential: ${page6.strategic_potential}`);
  const nextSteps = Array.isArray(page6.next_steps)
    ? page6.next_steps.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  if (nextSteps.length) lines.push(`Next steps: ${nextSteps.join('; ')}`);
  lines.push('');
  lines.push('Business Plan (user input)');
  lines.push(String(planText || ''));

  return lines.join('\n');
};

const createVectorStore = async ({ name, metadata }) => {
  return await openaiFetchJsonBeta('/vector_stores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      metadata: metadata || null,
    }),
  });
};

const deleteVectorStore = async (vectorStoreId) => {
  await openaiFetchJsonBeta(`/vector_stores/${encodeURIComponent(vectorStoreId)}`, {
    method: 'DELETE',
  });
};

const uploadTextFile = async ({ filename, text }) => {
  const form = new FormData();
  form.append('purpose', 'assistants');
  form.append(
    'file',
    new Blob([text], { type: 'text/plain; charset=utf-8' }),
    filename
  );

  return await openaiFetchJson('/files', {
    method: 'POST',
    body: form,
  });
};

const attachFileToVectorStore = async ({ vectorStoreId, fileId }) => {
  return await openaiFetchJsonBeta(
    `/vector_stores/${encodeURIComponent(vectorStoreId)}/files`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_id: fileId }),
    }
  );
};

const updateVectorStoreFileAttributes = async ({
  vectorStoreId,
  vectorStoreFileId,
  attributes,
}) => {
  return await openaiFetchJsonBeta(
    `/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(
      vectorStoreFileId
    )}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attributes: attributes || null }),
    }
  );
};

const searchVectorStore = async ({ vectorStoreId, query, maxResults = 8 }) => {
  const payload = {
    query,
    max_num_results: Math.max(1, Math.min(50, maxResults)),
    rewrite_query: true,
    ranking_options: { ranker: 'auto' },
  };

  const data = await openaiFetchJsonBeta(
    `/vector_stores/${encodeURIComponent(vectorStoreId)}/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  return Array.isArray(data?.data) ? data.data : [];
};

const deleteVectorStoreFile = async ({ vectorStoreId, vectorStoreFileId }) => {
  await openaiFetchJsonBeta(
    `/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(
      vectorStoreFileId
    )}`,
    { method: 'DELETE' }
  );
};

const deleteFile = async ({ fileId }) => {
  await openaiFetchJson(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
};

export const getOrCreateUserVectorStoreId = async (authUserId) => {
  if (!authUserId) {
    return null;
  }

  const existing = await pool.query(
    'SELECT vector_store_id AS "vectorStoreId" FROM user_vector_stores WHERE auth_user_id = $1',
    [authUserId]
  );
  if (existing.rows[0]?.vectorStoreId) {
    return existing.rows[0].vectorStoreId;
  }

  const created = await createVectorStore({
    name: `cruxlens-${authUserId}`,
    metadata: { auth_user_id: authUserId },
  });
  const vectorStoreId = created?.id;
  if (!vectorStoreId) {
    throw new Error('OpenAI vector store create returned no id');
  }

  const inserted = await pool.query(
    `INSERT INTO user_vector_stores (auth_user_id, vector_store_id)
     VALUES ($1, $2)
     ON CONFLICT (auth_user_id) DO NOTHING
     RETURNING vector_store_id AS "vectorStoreId"`,
    [authUserId, vectorStoreId]
  );

  if (inserted.rows[0]?.vectorStoreId) {
    return inserted.rows[0].vectorStoreId;
  }

  const raced = await pool.query(
    'SELECT vector_store_id AS "vectorStoreId" FROM user_vector_stores WHERE auth_user_id = $1',
    [authUserId]
  );
  const existingId = raced.rows[0]?.vectorStoreId || null;

  if (existingId) {
    try {
      await deleteVectorStore(vectorStoreId);
    } catch (_error) {
      // best-effort cleanup of the unused store
    }
    return existingId;
  }

  return vectorStoreId;
};

export const indexReportInVectorStore = async ({
  authUserId,
  reportId,
  title,
  planText,
  reportJson,
}) => {
  if (!authUserId) {
    return null;
  }

  const existing = await pool.query(
    `SELECT id FROM report_vector_files WHERE auth_user_id = $1 AND report_id = $2 LIMIT 1`,
    [authUserId, reportId]
  );
  if (existing.rows.length) {
    return null;
  }

  const vectorStoreId = await getOrCreateUserVectorStoreId(authUserId);
  if (!vectorStoreId) {
    return null;
  }

  const text = buildReportIndexText({ reportId, title, planText, reportJson });
  const file = await uploadTextFile({
    filename: `report-${reportId}.txt`,
    text,
  });
  const fileId = file?.id;
  if (!fileId) {
    throw new Error('OpenAI file upload returned no id');
  }

  const vectorStoreFile = await attachFileToVectorStore({ vectorStoreId, fileId });
  const vectorStoreFileId = vectorStoreFile?.id;
  if (!vectorStoreFileId) {
    throw new Error('OpenAI vector store attach returned no id');
  }

  await updateVectorStoreFileAttributes({
    vectorStoreId,
    vectorStoreFileId,
    attributes: {
      report_id: reportId,
      title: String(title || ''),
    },
  });

  await pool.query(
    `INSERT INTO report_vector_files (report_id, auth_user_id, vector_store_id, file_id, vector_store_file_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [reportId, authUserId, vectorStoreId, fileId, vectorStoreFileId]
  );

  return {
    vectorStoreId,
    fileId,
    vectorStoreFileId,
  };
};

export const searchUserVectorStore = async ({ authUserId, query, maxResults = 8 }) => {
  if (!authUserId) {
    return [];
  }

  const safeQuery = clampQuery(query);
  if (!safeQuery) {
    return [];
  }

  const vectorStoreId = await getOrCreateUserVectorStoreId(authUserId);
  if (!vectorStoreId) {
    return [];
  }

  const results = await searchVectorStore({
    vectorStoreId,
    query: safeQuery,
    maxResults,
  });
  if (!results.length) {
    return [];
  }

  const fileIds = results.map((item) => item.file_id).filter(Boolean);
  const mapping = await pool.query(
    `SELECT rvf.file_id AS "fileId", rvf.report_id AS "reportId", r.title AS title
     FROM report_vector_files rvf
     JOIN reports r ON r.id = rvf.report_id
     WHERE rvf.auth_user_id = $1
     AND rvf.file_id = ANY($2::text[])`,
    [authUserId, fileIds]
  );

  const fileToReport = new Map();
  for (const row of mapping.rows) {
    fileToReport.set(row.fileId, { reportId: row.reportId, title: row.title });
  }

  return results.map((item) => {
    const match = fileToReport.get(item.file_id) || null;
    const snippet = Array.isArray(item.content)
      ? item.content
          .map((chunk) => chunk?.text)
          .filter(Boolean)
          .join('\n\n')
      : '';

    return {
      score: item.score,
      fileId: item.file_id,
      reportId: match?.reportId ?? null,
      title: match?.title ?? null,
      snippet,
      attributes: item.attributes || null,
    };
  });
};

export const deleteReportVectors = async ({ authUserId, reportId }) => {
  if (!authUserId) {
    return;
  }

  const mapped = await pool.query(
    `SELECT vector_store_id AS "vectorStoreId",
            file_id AS "fileId",
            vector_store_file_id AS "vectorStoreFileId"
     FROM report_vector_files
     WHERE auth_user_id = $1 AND report_id = $2`,
    [authUserId, reportId]
  );

  for (const row of mapped.rows) {
    const vectorStoreId = row.vectorStoreId;
    const vectorStoreFileId = row.vectorStoreFileId;
    const fileId = row.fileId;

    if (vectorStoreId && vectorStoreFileId) {
      try {
        await deleteVectorStoreFile({ vectorStoreId, vectorStoreFileId });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    if (fileId) {
      try {
        await deleteFile({ fileId });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }
  }

  await pool.query(
    `DELETE FROM report_vector_files WHERE auth_user_id = $1 AND report_id = $2`,
    [authUserId, reportId]
  );
};
