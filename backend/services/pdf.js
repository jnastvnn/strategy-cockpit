import puppeteer from 'puppeteer';

const buildHtmlDocument = (bodyHtml, title) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      @media print {
        .report-page {
          break-after: page;
          page-break-after: always;
        }
        .report-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }
        h2, h3, h4 {
          break-after: avoid;
          page-break-after: avoid;
        }
        p {
          orphans: 3;
          widows: 3;
        }
        li {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        table, tr, td, th {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .avoid-page-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;

const launchBrowser = async () => {
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  return puppeteer.launch({
    headless: 'new',
    args,
    ...(executablePath ? { executablePath } : {}),
  });
};

export const renderReportPdf = async ({ bodyHtml, title }) => {
  const safeTitle = String(title || '').trim() || 'Report';
  const html = buildHtmlDocument(bodyHtml, safeTitle);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('print');
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
    });
  } finally {
    await browser.close();
  }
};
