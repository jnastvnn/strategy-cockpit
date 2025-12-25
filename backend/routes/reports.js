import express from 'express';
import { pool } from '../db/index.js';
import {
  generateReport,
  parseReportJson,
  renderReportHtml,
} from '../services/openai.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const authUserId = req.headers['x-user-id'];
    const userId = req.query.userId;

    if (!authUserId && !userId) {
      return res.json({ reports: [] });
    }

    const filters = [];
    const values = [];

    if (authUserId) {
      values.push(authUserId);
      filters.push(`auth_user_id = $${values.length}`);
    } else if (userId) {
      values.push(userId);
      filters.push(`user_id = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, title, plan_text AS "planText", report_text AS "reportText", created_at AS "createdAt"
       FROM reports
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      values
    );

    const reports = result.rows.map((row) => {
      const rawText = row.reportText;
      let rendered = rawText;

      if (rawText) {
        try {
          const parsed = parseReportJson(rawText);
          rendered = renderReportHtml(parsed);
        } catch (_error) {
          rendered = rawText;
        }
      }

      return { ...row, reportText: rendered };
    });

    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

router.post('/', async (req, res) => {
  const { planText, title, userId } = req.body;
  const authUserId = req.headers['x-user-id'] || null;

  if (!planText || typeof planText !== 'string') {
    return res.status(400).json({ error: 'planText is required' });
  }

  try {
    const { reportJson, reportHtml, title: generatedTitle } = await generateReport(planText);
    const finalTitle = title || generatedTitle || null;
    const reportJsonText = JSON.stringify(reportJson);
    const result = await pool.query(
      `INSERT INTO reports (user_id, auth_user_id, title, plan_text, report_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, plan_text AS "planText", report_text AS "reportText", created_at AS "createdAt"`,
      [userId || null, authUserId, finalTitle, planText, reportJsonText]
    );

    const saved = result.rows[0];
    res.status(201).json({ report: { ...saved, reportText: reportHtml } });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Failed to generate report';
    res.status(500).json({ error: message });
  }
});

export default router;
