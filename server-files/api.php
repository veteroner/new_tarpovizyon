<?php
// api.php - Bu dosyayı sunucunuza yükleyin
// GÜVENLİK: Production'da bu API key'i değiştirin!
$API_KEY = "REDACTED_DASHBOARD_KEY";

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// API Key kontrolü
$headers = getallheaders();
$providedKey = $headers['X-API-Key'] ?? $_GET['api_key'] ?? '';

if ($providedKey !== $API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ==== Tarpol AI — işlemci tanımlamaları ====
$TARPOL_AI_KEY = "REDACTED_GOOGLE_KEY";
$TARPOL_HF_KEY = "REDACTED_HF_KEY";
$TARPOL_GROQ_KEY = "REDACTED_GROQ_KEY";

// Gemini model listesi — en zekiden başlayarak fallback
// NOT: 2.5-pro kota dolu, 2.0-flash kota dolu, 1.5-* kaldırılmış (Mart 2026)
// Sadece gemini-2.5-flash çalışıyor (free tier'da unlimited)
$TARPOL_MODELS = [
    ['id' => 'gemini-2.5-flash', 'tokens' => 8192],
];

// Groq model listesi — Gemini tamamen başarısız olursa
$TARPOL_GROQ_MODELS = [
    ['id' => 'llama-3.3-70b-versatile', 'tokens' => 8192],
    ['id' => 'llama-3.1-8b-instant',    'tokens' => 4096],
];

// Gemini API çağrı yardımcısı
function callGemini($modelId, $maxTokens, $systemPrompt, $message, $apiKey) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelId}:generateContent?key={$apiKey}";
    $payload = [
        'contents'          => [['role' => 'user', 'parts' => [['text' => $message]]]],
        'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
        'generationConfig'  => ['temperature' => 0.7, 'maxOutputTokens' => $maxTokens],
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 25,
    ]);
    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    return ['body' => $response, 'code' => $httpCode, 'err' => $curlError];
}

// Groq API çağrı yardımcısı (OpenAI uyumlu)
function callGroq($modelId, $maxTokens, $systemPrompt, $message, $apiKey) {
    $url = 'https://api.groq.com/openai/v1/chat/completions';
    $payload = [
        'model'       => $modelId,
        'messages'    => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $message],
        ],
        'temperature' => 0.7,
        'max_tokens'  => $maxTokens,
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 25,
    ]);
    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    return ['body' => $response, 'code' => $httpCode, 'err' => $curlError];
}

// ---- AI Chat + TTS: DB gerektirmez, erken çık ----
$action = $_GET['action'] ?? 'tables';

// ---- TTS (Hugging Face) ----
if ($action === 'tts') {
    $body = json_decode(file_get_contents('php://input'), true);
    $text = trim($body['text'] ?? '');
    if (empty($text)) { echo json_encode(['error' => 'text required']); exit; }
    $text = mb_substr(strip_tags($text), 0, 400);

    $ch = curl_init('https://api-inference.huggingface.co/models/facebook/mms-tts-tur');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $TARPOL_HF_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode(['inputs' => $text]),
        CURLOPT_TIMEOUT    => 30,
    ]);
    $audio    = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && !empty($audio)) {
        echo json_encode(['audio' => base64_encode($audio)]);
    } else {
        http_response_code(502);
        echo json_encode(['error' => 'TTS geçici olarak kullanılamıyor.']);
    }
    exit;
}
// ---- /TTS ----

// ---- AI Chat ----
if ($action === 'ai_chat') {
    // --- Rate limiting: IP başına 30 istek/saat ---
    $ip        = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ip        = preg_replace('/[^a-fA-F0-9:.]/', '', explode(',', $ip)[0]);
    $rateFile  = sys_get_temp_dir() . '/ai_rate_' . md5($ip) . '.json';
    $rateLimit = 30;
    $rateWindow = 3600;

    $rateData = file_exists($rateFile) ? json_decode(file_get_contents($rateFile), true) : ['count' => 0, 'window_start' => time()];
    if (time() - $rateData['window_start'] > $rateWindow) {
        $rateData = ['count' => 0, 'window_start' => time()];
    }
    if ($rateData['count'] >= $rateLimit) {
        http_response_code(429);
        echo json_encode(['error' => 'Çok fazla istek. 1 saat sonra tekrar deneyin.']);
        exit;
    }
    $rateData['count']++;
    file_put_contents($rateFile, json_encode($rateData), LOCK_EX);

    $body    = json_decode(file_get_contents('php://input'), true);
    $message = trim($body['message'] ?? '');

    if (empty($message)) {
        echo json_encode(['error' => 'message required']);
        exit;
    }

    // Model seçimi — tüm modelleri sırayla dene (en zekiden başla)
    $selectedModels = $TARPOL_MODELS;

    $systemPrompt = 'Sen TarpoVizyon AI adında, tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanısın.

ÖNEMLİ KİMLİK BİLGİLERİ:
- Veteriner Hekim Öner Özbey tarafından geliştirildim
- Kurum: TARPOL (Tarım Politikaları Vakfı)
- Sadece tarım ve hayvancılık konularında yardımcı olabilirsin
- Bu alanlar dışındaki sorulara: "Ben yalnızca tarım ve hayvancılıkla ilgili konularda yardımcı olmak üzere tasarlandım. Lütfen bu alanda bir soru sorun." şeklinde yanıt ver

KİMLİK SORULARI İÇİN ÖZEL YANITLAR:
- Kim olduğun sorulduğunda: "Benim adım TarpoVizyon AI. Tarım ve hayvancılık alanında uzmanlaşmış bir yapay zeka asistanıyım."
- Kim yarattığın sorulduğunda: "Veteriner Hekim Öner Özbey tarafından geliştirildim. Kendisi, tarım ve hayvancılık sektöründe birçok yenilikçi projeye imza atmış ve sektörü modernize eden yaklaşımlarıyla tanınmaktadır."

TARIM UZMANLIKLARIN:
- Bitki yetiştiriciliği (tahıllar, sebzeler, meyveler, endüstri bitkileri)
- Hasat teknikleri ve zamanlaması
- Sulama sistemleri ve su yönetimi
- Gübreleme (organik, kimyasal, biyolojik)
- Tarım makineleri ve modern teknolojiler
- Sera yönetimi ve kontrollü ortam tarımı
- Organik tarım ve permakültür uygulamaları
- Bitki hastalıkları ve zararlıları (teşhis ve tedavi)
- Toprak analizi ve toprak sağlığı
- İklim koşulları ve meteorolojik faktörler
- Tohum seçimi ve ıslah çalışmaları
- Tarım ekonomisi ve pazarlama

HAYVANCILIK UZMANLIKLARIN:
- Büyükbaş hayvancılık (sığır, manda yetiştiriciliği)
- Küçükbaş hayvancılık (koyun, keçi yetiştiriciliği)
- Kanatlı hayvan yetiştiriciliği (tavuk, hindi, ördek, kaz)
- Arıcılık ve bal üretimi
- Su ürünleri yetiştiriciliği (balık çiftlikleri)
- Hayvan beslenmesi ve yem formülasyonu
- Hayvan sağlığı ve veteriner hekimlik uygulamaları
- Hayvan ıslahı ve genetik gelişim
- Süt üretimi ve süt teknolojisi
- Et üretimi ve kasaplık teknolojisi
- Hayvan refahı ve barınma koşulları
- Hayvan hastalıkları ve aşılama programları
- Hayvancılık ekonomisi ve karlılık analizi

YANITLAMA KURALLARI:
- Türkçe, bilimsel ama anlaşılır yanıtlar ver
- Çiftçilere ve hayvancılara pratik çözümler sun
- Türkiye\'nin iklim ve coğrafi özelliklerini dikkate al
- Detaylı ama özlü yanıtlar ver, 2000 karakteri geçme
- Markdown formatını kullanabilirsin (kalın, başlık, madde listesi, tablo)
- Fiyat/istatistik sorularında "En güncel veriler için TarpoVizyon platformunu ziyaret edin" ekle';

    $answer    = null;

    // AŞAMA 1: Gemini modelleri
    foreach ($selectedModels as $model) {
        $res = callGemini($model['id'], $model['tokens'], $systemPrompt, $message, $TARPOL_AI_KEY);

        if ($res['err']) continue; // curl hatası → sonraki model

        if ($res['code'] === 429) continue; // rate limit → sonraki model

        $data = json_decode($res['body'], true);

        if ($res['code'] === 200 && !empty($data['candidates'][0]['content']['parts'][0]['text'])) {
            $answer = $data['candidates'][0]['content']['parts'][0]['text'];
            break;
        }
    }

    // AŞAMA 2: Gemini başarısız → Groq fallback
    if (empty($answer)) {
        foreach ($TARPOL_GROQ_MODELS as $gm) {
            $res = callGroq($gm['id'], $gm['tokens'], $systemPrompt, $message, $TARPOL_GROQ_KEY);

            if ($res['err']) continue;
            if ($res['code'] === 429) continue;

            $data = json_decode($res['body'], true);

            if ($res['code'] === 200 && !empty($data['choices'][0]['message']['content'])) {
                $answer = $data['choices'][0]['message']['content'];
                break;
            }
        }
    }

    if (empty($answer)) {
        http_response_code(502);
        echo json_encode(['error' => 'Tarpol AI geçici olarak yanıt veremiyor. Lütfen tekrar deneyin.']);
        exit;
    }

    echo json_encode(['success' => true, 'reply' => $answer, 'model' => 'Tarpol AI']);
    exit;
}
// ---- /AI Chat ----

$servername = "localhost";
$username = "ist_172505";
$password = "ist_172505";
$dbname = "ist";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

switch($action) {
    case 'tables':
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $result = [];
        foreach($tables as $table) {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
            $count = $countStmt->fetchColumn();
            
            $columnsStmt = $pdo->query("DESCRIBE `$table`");
            $columns = $columnsStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result[] = [
                'name' => $table,
                'row_count' => (int)$count,
                'columns' => $columns
            ];
        }
        echo json_encode(['tables' => $result]);
        break;
        
    case 'data':
        $table = $_GET['table'] ?? '';
        $limit = min((int)($_GET['limit'] ?? 100), 1000);
        $offset = (int)($_GET['offset'] ?? 0);
        
        if (empty($table)) {
            echo json_encode(['error' => 'Table name required']);
            exit;
        }
        
        $stmt = $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table));
        if ($stmt->rowCount() === 0) {
            echo json_encode(['error' => 'Table not found']);
            exit;
        }
        
        $stmt = $pdo->query("SELECT * FROM `$table` LIMIT $limit OFFSET $offset");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $countStmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
        $total = $countStmt->fetchColumn();
        
        echo json_encode([
            'table' => $table,
            'data' => $data,
            'total' => (int)$total,
            'limit' => $limit,
            'offset' => $offset
        ]);
        break;
        
    case 'query':
        $sql = $_GET['sql'] ?? $_POST['sql'] ?? '';
        
        if (empty($sql)) {
            echo json_encode(['error' => 'SQL query required']);
            exit;
        }
        
        if (!preg_match('/^\s*SELECT/i', $sql)) {
            echo json_encode(['error' => 'Only SELECT queries allowed']);
            exit;
        }
        
        try {
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['data' => $data]);
        } catch(PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'stats':
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $stats = [
            'total_tables' => count($tables),
            'tables' => []
        ];
        
        foreach($tables as $table) {
            $countStmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
            $count = $countStmt->fetchColumn();
            $stats['tables'][$table] = (int)$count;
            $stats['total_rows'] = ($stats['total_rows'] ?? 0) + $count;
        }
        
        echo json_encode($stats);
        break;
    
    case 'execute':
        $sql = $_GET['sql'] ?? $_POST['sql'] ?? '';
        
        if (empty($sql)) {
            echo json_encode(['error' => 'SQL query required']);
            exit;
        }
        
        if (preg_match('/^\s*SELECT/i', $sql)) {
            echo json_encode(['error' => 'Use query action for SELECT']);
            exit;
        }
        
        try {
            $affected = $pdo->exec($sql);
            echo json_encode(['success' => true, 'affected_rows' => $affected]);
        } catch(PDOException $e) {
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
    
    case 'batch_insert':
        $table = $_POST['table'] ?? '';
        $dataJson = $_POST['data'] ?? '';
        
        if (empty($table) || empty($dataJson)) {
            echo json_encode(['error' => 'Table and data required']);
            exit;
        }
        
        $data = json_decode($dataJson, true);
        if (!$data || !is_array($data)) {
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }
        
        try {
            $pdo->beginTransaction();
            $inserted = 0;
            
            foreach ($data as $row) {
                $columns = array_keys($row);
                $placeholders = array_fill(0, count($columns), '?');
                $sql = "INSERT INTO `$table` (`" . implode('`, `', $columns) . "`) VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_values($row));
                $inserted++;
            }
            
            $pdo->commit();
            echo json_encode(['success' => true, 'inserted' => $inserted]);
        } catch(PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'get_announcements':
        // Auto-create table if not exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS `app_announcements` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(255) NOT NULL,
            `time_label` VARCHAR(50) NOT NULL DEFAULT 'Yeni',
            `color` VARCHAR(50) NOT NULL DEFAULT 'bg-emerald-500',
            `is_active` TINYINT(1) NOT NULL DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Seed default rows if table is empty
        $count = $pdo->query("SELECT COUNT(*) FROM app_announcements")->fetchColumn();
        if ((int)$count === 0) {
            $pdo->exec("INSERT INTO app_announcements (title, time_label, color) VALUES
                ('Emtia fiyatları Yahoo Finance canlı bağlantısı aktif', 'Bugün', 'bg-emerald-500'),
                ('Dış ticaret 2025 verileri eklendi', '1 Mar', 'bg-blue-500'),
                ('TÜİK Hayvansal Üretim 2024 verileri güncellendi', 'Şub 2026', 'bg-amber-500')
            ");
        }

        $stmt = $pdo->query("SELECT id, title, time_label, color FROM app_announcements WHERE is_active=1 ORDER BY created_at DESC LIMIT 5");
        echo json_encode(['announcements' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    case 'add_announcement':
        $body = json_decode(file_get_contents('php://input'), true);
        $title = trim($body['title'] ?? '');
        $timeLabel = trim($body['time_label'] ?? 'Yeni');
        $color = trim($body['color'] ?? 'bg-emerald-500');

        if (empty($title)) {
            echo json_encode(['error' => 'title required']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO app_announcements (title, time_label, color) VALUES (?, ?, ?)");
        $stmt->execute([$title, $timeLabel, $color]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;

    // ========== YUMURTA FİYATLARI ==========
    case 'egg_prices':
        $cacheFile = sys_get_temp_dir() . '/egg_prices_cache.json';
        $cacheAge  = file_exists($cacheFile) ? time() - filemtime($cacheFile) : 99999;

        // 15 dakika cache
        if ($cacheAge < 900 && ($cached = @file_get_contents($cacheFile))) {
            echo $cached;
            break;
        }

        // Yumurta Üreticileri  Birliği / yumurtafiyat.com scrape
        $prices = [];
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://www.yumurtafiyat.com/',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $html = curl_exec($ch);
        curl_close($ch);

        if ($html) {
            // Parse price cards from the page
            if (preg_match_all('/<div[^>]*class="[^"]*fiyat[^"]*"[^>]*>.*?<\/div>/si', $html, $cards)) {
                foreach ($cards[0] as $card) {
                    if (preg_match('/(\d+[\.,]\d+)\s*(?:TL|₺)/i', $card, $pm)) {
                        if (preg_match('/(beyaz|kırmızı|organik|omega|serbest|köy)/iu', $card, $nm)) {
                            $name = ucfirst(mb_strtolower(trim($nm[1]), 'UTF-8'));
                            $prices[$name] = str_replace(',', '.', $pm[1]);
                        }
                    }
                }
            }
            // Fallback: try table rows
            if (empty($prices) && preg_match_all('/<tr[^>]*>.*?<\/tr>/si', $html, $rows)) {
                foreach ($rows[0] as $row) {
                    if (preg_match_all('/<td[^>]*>(.*?)<\/td>/si', $row, $cells) && count($cells[1]) >= 2) {
                        $label = strip_tags(trim($cells[1][0]));
                        $val   = strip_tags(trim($cells[1][1]));
                        if (preg_match('/\d/', $val) && mb_strlen($label) > 2) {
                            $prices[$label] = str_replace(',', '.', preg_replace('/[^\d,\.]/', '', $val));
                        }
                    }
                }
            }
        }

        // Fallback statik fiyatlar (güncel ortalamalara göre)
        if (empty($prices)) {
            $prices = [
                'Beyaz (30\'lu)' => '145.00',
                'Kırmızı (30\'lu)' => '155.00',
                'Organik (10\'lu)' => '89.90',
                'Köy Yumurtası (10\'lu)' => '75.00',
                'Omega-3 (10\'lu)' => '92.00',
                'Serbest Gezen (10\'lu)' => '85.00',
            ];
        }

        $result = json_encode([
            'success' => true,
            'prices' => $prices,
            'source' => 'yumurtafiyat.com',
            'updated' => date('Y-m-d H:i:s'),
        ]);
        @file_put_contents($cacheFile, $result);
        echo $result;
        break;

    // ========== YAHOO FİNANCE EMTİA FİYATLARI ==========
    case 'commodity_prices':
        $cacheFile2 = sys_get_temp_dir() . '/commodity_prices_cache.json';
        $cacheAge2  = file_exists($cacheFile2) ? time() - filemtime($cacheFile2) : 99999;

        // 5 dakika cache
        if ($cacheAge2 < 300 && ($cached2 = @file_get_contents($cacheFile2))) {
            echo $cached2;
            break;
        }

        $symbols = [
            // Tahıllar & Yağlı Tohumlar
            'ZW=F'  => ['name' => 'Buğday', 'category' => 'Tahıllar', 'unit' => '¢/bushel'],
            'ZC=F'  => ['name' => 'Mısır',  'category' => 'Tahıllar', 'unit' => '¢/bushel'],
            'ZS=F'  => ['name' => 'Soya Fasulyesi', 'category' => 'Yağlı Tohumlar', 'unit' => '¢/bushel'],
            'ZL=F'  => ['name' => 'Soya Yağı', 'category' => 'Yağlı Tohumlar', 'unit' => '¢/lb'],
            'ZM=F'  => ['name' => 'Soya Küspesi', 'category' => 'Yağlı Tohumlar', 'unit' => '$/ton'],
            'ZO=F'  => ['name' => 'Yulaf', 'category' => 'Tahıllar', 'unit' => '¢/bushel'],
            'ZR=F'  => ['name' => 'Pirinç', 'category' => 'Tahıllar', 'unit' => '¢/cwt'],
            'KE=F'  => ['name' => 'KC HRW Buğday', 'category' => 'Tahıllar', 'unit' => '¢/bushel'],
            // Yumuşak Emtialar
            'CT=F'  => ['name' => 'Pamuk', 'category' => 'Endüstriyel', 'unit' => '¢/lb'],
            'KC=F'  => ['name' => 'Kahve', 'category' => 'Tropikal', 'unit' => '¢/lb'],
            'SB=F'  => ['name' => 'Şeker', 'category' => 'Tropikal', 'unit' => '¢/lb'],
            'CC=F'  => ['name' => 'Kakao', 'category' => 'Tropikal', 'unit' => '$/ton'],
            'OJ=F'  => ['name' => 'Portakal Suyu', 'category' => 'Tropikal', 'unit' => '¢/lb'],
            // Canlı Hayvan
            'LE=F'  => ['name' => 'Canlı Sığır', 'category' => 'Hayvancılık', 'unit' => '¢/lb'],
            'GF=F'  => ['name' => 'Besilik Sığır', 'category' => 'Hayvancılık', 'unit' => '¢/lb'],
            'HE=F'  => ['name' => 'Yağsız Domuz', 'category' => 'Hayvancılık', 'unit' => '¢/lb'],
            // Süt
            'DC=F'  => ['name' => 'Süt (Class III)', 'category' => 'Süt Ürünleri', 'unit' => '$/cwt'],
            // Enerji (tarımla ilişkili)
            'NG=F'  => ['name' => 'Doğal Gaz', 'category' => 'Enerji', 'unit' => '$/MMBtu'],
        ];

        $symbolList = implode(',', array_keys($symbols));
        $yahooUrl = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" . urlencode($symbolList);
        
        $ch2 = curl_init();
        curl_setopt_array($ch2, [
            CURLOPT_URL => $yahooUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $yahooResp = curl_exec($ch2);
        $httpCode  = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        $commodities = [];
        $yahooSuccess = false;

        if ($yahooResp && $httpCode === 200) {
            $json = json_decode($yahooResp, true);
            $quotes = $json['quoteResponse']['result'] ?? [];
            if (!empty($quotes)) {
                $yahooSuccess = true;
                foreach ($quotes as $q) {
                    $sym = $q['symbol'] ?? '';
                    if (isset($symbols[$sym])) {
                        $meta = $symbols[$sym];
                        $price = $q['regularMarketPrice'] ?? 0;
                        $prevClose = $q['regularMarketPreviousClose'] ?? $price;
                        $change = $price - $prevClose;
                        $changePct = $prevClose > 0 ? ($change / $prevClose) * 100 : 0;
                        $commodities[] = [
                            'symbol'    => $sym,
                            'name'      => $meta['name'],
                            'category'  => $meta['category'],
                            'unit'      => $meta['unit'],
                            'price'     => round($price, 2),
                            'change'    => round($change, 2),
                            'changePct' => round($changePct, 2),
                            'currency'  => $q['currency'] ?? 'USD',
                            'exchange'  => $q['exchange'] ?? '',
                            'time'      => $q['regularMarketTime'] ?? time(),
                        ];
                    }
                }
            }
        }

        // V7 başarısız olursa, V8 chart ile teker teker dene
        if (!$yahooSuccess) {
            foreach ($symbols as $sym => $meta) {
                $chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart/{$sym}?interval=1d&range=5d";
                $ch3 = curl_init();
                curl_setopt_array($ch3, [
                    CURLOPT_URL => $chartUrl,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 10,
                    CURLOPT_USERAGENT => 'Mozilla/5.0',
                    CURLOPT_SSL_VERIFYPEER => false,
                ]);
                $resp3 = curl_exec($ch3);
                curl_close($ch3);

                if ($resp3) {
                    $cj = json_decode($resp3, true);
                    $result3 = $cj['chart']['result'][0] ?? null;
                    if ($result3) {
                        $metaData = $result3['meta'] ?? [];
                        $price = $metaData['regularMarketPrice'] ?? 0;
                        $prevClose = $metaData['chartPreviousClose'] ?? $metaData['previousClose'] ?? $price;
                        $change = $price - $prevClose;
                        $changePct = $prevClose > 0 ? ($change / $prevClose) * 100 : 0;
                        $commodities[] = [
                            'symbol'    => $sym,
                            'name'      => $meta['name'],
                            'category'  => $meta['category'],
                            'unit'      => $meta['unit'],
                            'price'     => round($price, 2),
                            'change'    => round($change, 2),
                            'changePct' => round($changePct, 2),
                            'currency'  => $metaData['currency'] ?? 'USD',
                            'exchange'  => $metaData['exchangeName'] ?? '',
                            'time'      => $metaData['regularMarketTime'] ?? time(),
                        ];
                    }
                }
                usleep(200000); // 200ms arası
            }
        }

        $resultJson = json_encode([
            'success'     => !empty($commodities),
            'commodities' => $commodities,
            'source'      => $yahooSuccess ? 'Yahoo Finance v7' : 'Yahoo Finance v8 chart',
            'updated'     => date('Y-m-d H:i:s'),
            'count'       => count($commodities),
        ]);
        @file_put_contents($cacheFile2, $resultJson);
        echo $resultJson;
        break;

    // ========== TEK EMTİA DETAY (GRAFİK İÇİN) ==========
    case 'commodity_chart':
        $symbol = $_GET['symbol'] ?? '';
        $range  = $_GET['range']  ?? '1mo';
        $interval = $_GET['interval'] ?? '1d';
        
        if (empty($symbol)) {
            echo json_encode(['error' => 'symbol required']);
            break;
        }

        $chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" . urlencode($symbol) . "?interval={$interval}&range={$range}";
        $ch4 = curl_init();
        curl_setopt_array($ch4, [
            CURLOPT_URL => $chartUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_USERAGENT => 'Mozilla/5.0',
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $resp4 = curl_exec($ch4);
        curl_close($ch4);

        if ($resp4) {
            $cj = json_decode($resp4, true);
            $r = $cj['chart']['result'][0] ?? null;
            if ($r) {
                $timestamps = $r['timestamp'] ?? [];
                $closes = $r['indicators']['quote'][0]['close'] ?? [];
                $points = [];
                for ($i = 0; $i < count($timestamps); $i++) {
                    if (isset($closes[$i]) && $closes[$i] !== null) {
                        $points[] = ['t' => $timestamps[$i], 'c' => round($closes[$i], 2)];
                    }
                }
                echo json_encode([
                    'success' => true,
                    'symbol' => $symbol,
                    'range' => $range,
                    'data' => $points,
                ]);
                break;
            }
        }
        echo json_encode(['error' => 'Chart data not available']);
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
        break;
}
?>
