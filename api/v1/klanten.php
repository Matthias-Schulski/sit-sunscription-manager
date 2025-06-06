<?php
// api/v1/klanten.php

require_once __DIR__ . '/../db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare('SELECT * FROM klanten WHERE klant_id = ?');
                $stmt->execute([$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
            } else {
                $stmt = $pdo->query('SELECT * FROM klanten ORDER BY bedrijfsnaam');
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            if (!$result && $id) {
                http_response_code(404);
                $result = ['error' => 'Klant niet gevonden'];
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "INSERT INTO klanten (bedrijfsnaam, adres, postcode, plaats, rompslomp_client_id, routit_klantnummer, dsd_klantnummer, kvk_nummer, btw_nummer, is_particulier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['bedrijfsnaam'], $data['adres'] ?? null, $data['postcode'] ?? null, $data['plaats'] ?? null,
                empty($data['rompslomp_client_id']) ? null : $data['rompslomp_client_id'],
                empty($data['routit_klantnummer']) ? null : $data['routit_klantnummer'],
                empty($data['dsd_klantnummer']) ? null : $data['dsd_klantnummer'],
                $data['kvk_nummer'] ?? null, $data['btw_nummer'] ?? null,
                isset($data['is_particulier']) && $data['is_particulier'] == 1 ? 1 : 0
            ]);
            $newId = $pdo->lastInsertId();
            http_response_code(201);
            $stmt = $pdo->prepare('SELECT * FROM klanten WHERE klant_id = ?');
            $stmt->execute([$newId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            break;
            
        case 'PUT':
            if (!$id) throw new Exception('Klant ID is vereist voor een update.');
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "UPDATE klanten SET bedrijfsnaam = ?, adres = ?, postcode = ?, plaats = ?, rompslomp_client_id = ?, routit_klantnummer = ?, dsd_klantnummer = ?, kvk_nummer = ?, btw_nummer = ?, is_particulier = ? WHERE klant_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $data['bedrijfsnaam'], $data['adres'] ?? null, $data['postcode'] ?? null, $data['plaats'] ?? null,
                empty($data['rompslomp_client_id']) ? null : $data['rompslomp_client_id'],
                empty($data['routit_klantnummer']) ? null : $data['routit_klantnummer'],
                empty($data['dsd_klantnummer']) ? null : $data['dsd_klantnummer'],
                $data['kvk_nummer'] ?? null, $data['btw_nummer'] ?? null,
                isset($data['is_particulier']) && $data['is_particulier'] == 1 ? 1 : 0,
                $id
            ]);
            $stmt = $pdo->prepare('SELECT * FROM klanten WHERE klant_id = ?');
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            break;
            
        case 'DELETE':
            if (!$id) throw new Exception('Klant ID is vereist om te verwijderen.');
            $sql = "DELETE FROM klanten WHERE klant_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            http_response_code(204); // No Content
            $result = null; // Geen body terugsturen
            break;

        default:
            http_response_code(405);
            throw new Exception('Ongeldige request method');
            break;
    }
    if ($result !== null) {
        echo json_encode($result);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Databasefout: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
