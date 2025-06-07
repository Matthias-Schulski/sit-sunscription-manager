<?php
// api/v1/leveranciers.php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['naam'])) {
                throw new Exception('Naam van de leverancier is verplicht.');
            }
            $sql = "INSERT INTO leveranciers (naam) VALUES (?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['naam']]);
            
            http_response_code(201);
            $newId = $pdo->lastInsertId();
            
            $stmt = $pdo->prepare('SELECT * FROM leveranciers WHERE leverancier_id = ?');
            $stmt->execute([$newId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            break;

        default:
            http_response_code(405);
            $result = ['error' => 'Ongeldige request method'];
            break;
    }
    
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
