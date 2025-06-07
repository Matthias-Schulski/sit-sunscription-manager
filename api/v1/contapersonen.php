<?php
// api/v1/contactpersonen.php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$klant_id = isset($_GET['klant_id']) ? (int)$_GET['klant_id'] : null;

try {
    switch ($method) {
        case 'GET':
            if ($klant_id) {
                // Haal alle contacten voor een specifieke klant op
                $stmt = $pdo->prepare('SELECT * FROM klant_contactpersonen WHERE klant_id = ? ORDER BY is_primair_contact DESC, naam ASC');
                $stmt->execute([$klant_id]);
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Specifiek contact ophalen (niet typisch nodig, maar kan nuttig zijn)
                 $stmt = $pdo->prepare('SELECT * FROM klant_contactpersonen WHERE contact_id = ?');
                 $stmt->execute([$id]);
                 $result = $stmt->fetch(PDO::FETCH_ASSOC);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "INSERT INTO klant_contactpersonen (klant_id, naam, email, telefoon, functie, is_primair_contact) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['klant_id'],
                $data['naam'],
                $data['email'] ?? null,
                $data['telefoon'] ?? null,
                $data['functie'] ?? null,
                isset($data['is_primair_contact']) && $data['is_primair_contact'] ? 1 : 0
            ]);
            http_response_code(201);
            $newId = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM klant_contactpersonen WHERE contact_id = ?');
            $stmt->execute([$newId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            break;
            
        case 'PUT':
            if (!$id) throw new Exception('Contact ID is vereist voor een update.');
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "UPDATE klant_contactpersonen SET naam = ?, email = ?, telefoon = ?, functie = ?, is_primair_contact = ? WHERE contact_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['naam'],
                $data['email'] ?? null,
                $data['telefoon'] ?? null,
                $data['functie'] ?? null,
                isset($data['is_primair_contact']) && $data['is_primair_contact'] ? 1 : 0,
                $id
            ]);
            $stmt = $pdo->prepare('SELECT * FROM klant_contactpersonen WHERE contact_id = ?');
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            break;
            
        case 'DELETE':
            if (!$id) throw new Exception('Contact ID is vereist om te verwijderen.');
            $sql = "DELETE FROM klant_contactpersonen WHERE contact_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            http_response_code(204);
            $result = null;
            break;

        default:
            http_response_code(405);
            $result = ['error' => 'Ongeldige request method'];
            break;
    }
    
    if ($result !== null) {
        echo json_encode($result);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
