<?php
// api.php - Bu dosyayı sunucunuza yükleyin
// GÜVENLİK: Production'da bu API key'i değiştirin!
$API_KEY = "dashboard_secret_key_2024";

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

$action = $_GET['action'] ?? 'tables';

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
        
    default:
        echo json_encode(['error' => 'Unknown action']);
}
?>
