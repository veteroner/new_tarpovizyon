const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const tesseract = require('node-tesseract-ocr');
const fs = require('fs').promises;

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Production API endpoint
const PRODUCTION_API = 'https://dersbende.com/api.php';

function parseTrMoneyToNumber(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    let num = Number.parseFloat(normalized);
    
    // OCR sometimes misses the comma/decimal point
    // Egg prices are typically 2-5 TL, so if we get 2000-50000, divide by 10000
    // If we get 20-500, divide by 10
    if (Number.isFinite(num)) {
        if (num >= 20000 && num <= 50000) {
            num = num / 10000;
        } else if (num >= 2000 && num <= 5000) {
            num = num / 1000;
        } else if (num >= 20 && num <= 500) {
            num = num / 10;
        }
    }
    
    return Number.isFinite(num) ? num : null;
}

function stripHtmlToText(html) {
    if (typeof html !== 'string') return '';
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseEggPricesFromText(text) {
    const labels = [
        { key: 'double', patterns: ['Double'] },
        { key: 'eski_ana', patterns: ['Eski\\s*Ana', 'EskiAna'] },
        { key: 'yeni_ana', patterns: ['Yeni\\s*Ana', 'YeniAna'] },
        { key: 'yarka', patterns: ['Yarka'] },
        { key: 'pilic', patterns: ['Piliç', 'Pilig', 'Pilic'] },
        { key: 'kilavuz', patterns: ['Kılavuz', 'Klavuz', 'Kilavuz'] },
    ];

    // Try multiple date formats
    const dateMatch = text.match(/\b(\d{2}[-.\s]\d{2}[-.\s]\d{4})\b/);
    const date = dateMatch ? dateMatch[1] : null;

    const prices = {};
    for (const { key, patterns } of labels) {
        let foundPrice = null;
        
        // Try each pattern
        for (const pattern of patterns) {
            const re = new RegExp(`${pattern}\\s*[:—\\-\u00A0 ]*\\s*([0-9.,]+)\\s*TL`, 'i');
            const m = text.match(re);
            if (m) {
                const num = parseTrMoneyToNumber(m[1]);
                if (num != null && num > 0 && num < 100) { // Sanity check: prices should be between 0-100 TL
                    foundPrice = num;
                    break;
                }
            }
        }
        
        if (foundPrice != null) prices[key] = foundPrice;
    }

    return {
        success: true,
        source: 'basmakcitavukculuk.com',
        date,
        prices,
    };
}

// Direct MySQL endpoints disabled (database not accessible from localhost)
// Use production API proxy instead via /api.php

// Production-style API endpoint (/api.php) - proxy to production
app.get('/api.php', async (req, res) => {
    try {
        const { action, api_key, sql } = req.query;
        
        // Validate API key
        if (api_key !== 'REDACTED_DASHBOARD_KEY') {
            return res.status(401).json({ success: false, error: 'Invalid API key' });
        }
        
        if (action === 'query') {
            if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
                return res.status(400).json({ success: false, error: 'Sadece SELECT sorguları desteklenir' });
            }
            
            // Proxy to production API
            const response = await axios.get(PRODUCTION_API, {
                params: { action, api_key, sql },
                timeout: 30000
            });
            
            res.json(response.data);
        } else {
            res.status(400).json({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('API Proxy Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Live egg prices endpoint (scrapes basmakcitavukculuk.com and returns parsed values)
app.get('/egg-prices', async (_req, res) => {
    try {
        // Note: The homepage renders prices as a PNG image (indexyumurta.php).
        // We still try to parse any text if present, but usually the client must OCR the image.
        const response = await axios.get('https://basmakcitavukculuk.com/', {
            timeout: 20000,
            headers: {
                'User-Agent': 'dashboard-project/1.0 (+https://basmakcitavukculuk.com/)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const text = stripHtmlToText(String(response.data ?? ''));
        const payload = parseEggPricesFromText(text);
        res.json({ ...payload, imageUrl: '/egg-prices-image' });
    } catch (error) {
        console.error('Egg prices fetch error:', error.message);
        res.status(502).json({ success: false, error: 'Egg prices fetch failed' });
    }
});

// Proxies the price image used on the site (for OCR in the client)
app.get('/egg-prices-image', async (_req, res) => {
    try {
        const response = await axios.get('https://basmakcitavukculuk.com/indexyumurta.php', {
            timeout: 20000,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'dashboard-project/1.0 (+https://basmakcitavukculuk.com/)',
                'Accept': 'image/png,image/*;q=0.9,*/*;q=0.8'
            }
        });
        res.setHeader('Content-Type', 'image/png');
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('Egg price image fetch error:', error.message);
        res.status(502).send('Egg price image fetch failed');
    }
});

// Puppeteer scraper for egg prices
app.get('/egg-prices-puppeteer', async (_req, res) => {
    let browser;
    const tempImagePath = path.join(__dirname, 'temp-egg-price.png');
    
    try {
        console.log('🚀 Launching Puppeteer browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        console.log('📖 Navigating to basmakcitavukculuk.com...');
        await page.goto('https://basmakcitavukculuk.com/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for the price image to load
        console.log('⏳ Waiting for price image...');
        await page.waitForSelector('img[src*="indexyumurta"]', { timeout: 10000 }).catch(() => {
            console.log('⚠️ Price image not found with img tag');
        });
        
        console.log('🔍 Finding price image...');
        const priceImageElement = await page.$('img[src*="indexyumurta"]');
        
        if (priceImageElement) {
            console.log('📸 Taking screenshot of price image...');
            const screenshotBuffer = await priceImageElement.screenshot();
            
            // Save temporarily for OCR
            await fs.writeFile(tempImagePath, screenshotBuffer);
            console.log('💾 Saved screenshot to:', tempImagePath);
            
            // Run Tesseract OCR
            console.log('🔤 Running Tesseract OCR...');
            const config = {
                lang: 'tur+eng',
                oem: 3,
                psm: 6,
            };
            
            const text = await tesseract.recognize(tempImagePath, config);
            console.log('📝 OCR extracted text:', text.substring(0, 300));
            
            // Parse the text
            const result = parseEggPricesFromText(text);
            console.log('✅ Parsed result:', result);
            
            // Cleanup
            await fs.unlink(tempImagePath).catch(() => {});
            
            res.json(result);
        } else {
            console.log('⚠️ Price image element not found, trying full page text');
            const pageText = await page.evaluate(() => document.body.innerText);
            const result = parseEggPricesFromText(pageText);
            res.json(result);
        }
    } catch (error) {
        console.error('❌ Puppeteer scraping error:', error.message);
        console.error(error.stack);
        
        // Cleanup on error
        await fs.unlink(tempImagePath).catch(() => {});
        
        res.status(502).json({ success: false, error: 'Puppeteer scraping failed: ' + error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Direct MySQL endpoints disabled (database not accessible from localhost)
// app.post('/api/query', ...) - use /api.php instead
// app.get('/api/stats', ...) - disabled
// app.post('/api/aggregate', ...) - disabled

// Ana sayfa
app.get('/', (req, res) => {
    // This server is primarily for API/db-explorer endpoints.
    // The React UI is served by Vite (npm run dev).
    const indexPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).send('UI is served by Vite. Run `npm run dev` and open http://localhost:3000');
        }
    });
});

// Other MySQL write operations disabled (database not accessible)
// app.post('/api/create-table-with-data') - disabled
// app.post('/api/execute-sql') - disabled

app.listen(PORT, () => {
    console.log(`Dashboard sunucusu http://localhost:${PORT} adresinde çalışıyor`);
    console.log(`Proxying API requests to ${PRODUCTION_API}`);
});
