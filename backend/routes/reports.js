import express from 'express';
import { pool } from '../db/index.js';
import {
  generateReport,
  parseReportJson,
  renderReportHtml,
} from '../services/openai.js';
import { renderReportPdf } from '../services/pdf.js';
import { requireNeonAuth } from '../middleware/neon-auth.js';
import {
  deleteReportVectors,
  indexReportInVectorStore,
  searchUserVectorStore,
} from '../services/vector-store.js';

const router = express.Router();

router.use(requireNeonAuth);

router.get('/', async (req, res) => {
  try {
    const authUserId = req.authUserId;

    const result = await pool.query(
      `SELECT id, title, plan_text AS "planText", report_text AS "reportText", created_at AS "createdAt"
       FROM reports
       WHERE auth_user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [authUserId]
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

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (typeof query !== 'string' || !query.trim()) {
      return res.json({ results: [] });
    }

    const results = await searchUserVectorStore({
      authUserId: req.authUserId,
      query: query.trim(),
      maxResults: 12,
    });
    return res.json({ results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to search report history' });
  }
});

router.get('/:id/pdf', async (req, res) => {
  const authUserId = req.authUserId;
  const reportId = Number.parseInt(req.params.id, 10);

  if (!Number.isFinite(reportId)) {
    return res.status(400).json({ error: 'Invalid report id' });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, report_text AS "reportText"
       FROM reports
       WHERE id = $1 AND auth_user_id = $2`,
      [reportId, authUserId]
    );

    const report = result.rows[0];
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    let html = '';
    if (report.reportText) {
      try {
        const parsed = parseReportJson(report.reportText);
        html = renderReportHtml(parsed);
      } catch (_error) {
        html = String(report.reportText);
      }
    }

    if (!html) {
      return res.status(400).json({ error: 'Report content is empty' });
    }

    const title = report.title || `report-${report.id}`;
    const safeTitle =
      String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `report-${report.id}`;

    const pdfBuffer = await renderReportPdf({ bodyHtml: html, title });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}.pdf"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : 'Failed to generate report PDF';
    return res.status(500).json({ error: message });
  }
});

router.post('/', async (req, res) => {
  const { planText, title } = req.body;
  const authUserId = req.authUserId;

  if (!planText || typeof planText !== 'string') {
    return res.status(400).json({ error: 'planText is required' });
  }

  try {
    const { reportJson, reportHtml, title: generatedTitle } = await generateReport(
      planText,
      { authUserId }
    );
    const finalTitle = title || generatedTitle || null;
    const reportJsonText = JSON.stringify(reportJson);
    const result = await pool.query(
      `INSERT INTO reports (auth_user_id, title, plan_text, report_text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, plan_text AS "planText", report_text AS "reportText", created_at AS "createdAt"`,
      [authUserId, finalTitle, planText, reportJsonText]
    );

    const saved = result.rows[0];

    if (authUserId && saved?.id) {
      void indexReportInVectorStore({
        authUserId,
        reportId: saved.id,
        title: saved.title,
        planText,
        reportJson,
      }).catch((error) => {
        console.error('Vector store indexing failed:', error);
      });
    }

    res.status(201).json({ report: { ...saved, reportText: reportHtml } });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Failed to generate report';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', async (req, res) => {
  const authUserId = req.authUserId;
  const reportId = Number.parseInt(req.params.id, 10);

  if (!Number.isFinite(reportId)) {
    return res.status(400).json({ error: 'Invalid report id' });
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM reports WHERE id = $1 AND auth_user_id = $2`,
      [reportId, authUserId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await deleteReportVectors({ authUserId, reportId });

    await pool.query(`DELETE FROM reports WHERE id = $1 AND auth_user_id = $2`, [
      reportId,
      authUserId,
    ]);

    return res.status(204).end();
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : 'Failed to delete report';
    return res.status(500).json({ error: message });
  }
});

export default router;
