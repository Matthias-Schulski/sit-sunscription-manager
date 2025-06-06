<?php
// api/v1/producten.php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // --- PAGINATIE PARAMETERS ---
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 25;
        $offset = ($page - 1) * $perPage;

        // --- FILTER PARAMETERS ---
        $filter_type = $_GET['type'] ?? 'abonnementen'; // 'abonnementen' of 'eenmalig'
        
        $whereClause = "WHERE pc.facturatie_cyclus != 'eenmalig'";
        if ($filter_type === 'eenmalig') {
            $whereClause = "WHERE pc.facturatie_cyclus = 'eenmalig'";
        }
        
        // --- TOTAAL AANTAL ITEMS OPHALEN VOOR PAGINATIE ---
        $totalResult = $pdo->query("SELECT COUNT(pc.product_id) FROM product_catalogus pc $whereClause");
        $totalItems = $totalResult->fetchColumn();
        $totalPages = ceil($totalItems / $perPage);

        // --- PRODUCTEN OPHALEN MET MARGE EN LEVERANCIERNAAM ---
        $sql = "SELECT 
                    pc.*, 
                    l.naam as leverancier_naam,
                    g.naam as grootboek_naam,
                    CASE 
                        WHEN pc.standaard_verkoopprijs > 0 THEN ((pc.standaard_verkoopprijs - pc.standaard_inkoopprijs) / pc.standaard_verkoopprijs) * 100
                        ELSE 0 
                    END as marge_percentage
                FROM product_catalogus pc
                LEFT JOIN leveranciers l ON pc.leverancier_id = l.leverancier_id
                LEFT JOIN grootboekrekeningen g ON pc.grootboekrekening_id = g.grootboek_id
                $whereClause
                ORDER BY pc.titel
                LIMIT :perPage OFFSET :offset";

        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(':perPage', $perPage, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // --- RESULTAAT SAMENSTELLEN ---
        $result = [
            'pagination' => [
                'currentPage' => $page,
                'totalPages' => $totalPages,
                'totalItems' => (int)$totalItems,
                'perPage' => $perPage
            ],
            'data' => $products
        ];

        echo json_encode($result);

    } else {
        // POST, PUT, DELETE logica voor producten moet hier nog geïmplementeerd worden.
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Deze methode is nog niet geïmplementeerd voor producten.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Serverfout: ' . $e->getMessage()]);
}
?>
