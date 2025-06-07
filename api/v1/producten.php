<?php
// api/v1/producten.php
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

try {
    switch ($method) {
        case 'GET':
            // Basis SQL query met JOINs en een subquery voor het tellen van verkopen
            $baseSql = "SELECT 
                            pc.*, 
                            l.naam as leverancier_naam,
                            g.naam as grootboek_naam,
                            (SELECT COUNT(*) FROM klant_diensten kd WHERE kd.product_id = pc.product_id) as sales_count,
                            CASE 
                                WHEN pc.standaard_verkoopprijs > 0 THEN ((pc.standaard_verkoopprijs - pc.standaard_inkoopprijs) / pc.standaard_verkoopprijs) * 100
                                ELSE 0 
                            END as marge_percentage
                        FROM product_catalogus pc
                        LEFT JOIN leveranciers l ON pc.leverancier_id = l.leverancier_id
                        LEFT JOIN grootboekrekeningen g ON pc.grootboekrekening_id = g.grootboek_id";

            if ($id) {
                // Haal een specifiek product op
                $stmt = $pdo->prepare("$baseSql WHERE pc.product_id = ?");
                $stmt->execute([$id]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$result) {
                    http_response_code(404);
                    throw new Exception("Product met ID $id niet gevonden.");
                }
            } else {
                // Haal een lijst met producten op met paginatie, filtering en sortering
                $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 25;
                $offset = ($page - 1) * $perPage;
                
                // --- Verwerk Sorteer- en Filterparameters ---
                $filter_type = $_GET['type'] ?? 'abonnementen';
                $search_term = $_GET['search'] ?? '';
                $supplier_id = $_GET['supplier'] ?? '';
                $category_id = $_GET['category'] ?? '';

                $sort_by = $_GET['sort_by'] ?? 'titel';
                $sort_order = strtoupper($_GET['sort_order'] ?? 'ASC');

                // Whitelist voor sorteerkolommen om SQL-injectie te voorkomen
                $allowedSortColumns = ['titel', 'standaard_verkoopprijs', 'standaard_inkoopprijs', 'marge_percentage', 'sales_count'];
                if (!in_array($sort_by, $allowedSortColumns)) {
                    $sort_by = 'titel';
                }
                if ($sort_order !== 'ASC' && $sort_order !== 'DESC') {
                    $sort_order = 'ASC';
                }

                $whereConditions = [];
                $params = [];

                if ($filter_type === 'eenmalig') {
                    $whereConditions[] = "pc.facturatie_cyclus = 'eenmalig'";
                } else {
                    $whereConditions[] = "pc.facturatie_cyclus != 'eenmalig'";
                }

                if (!empty($search_term)) {
                    $whereConditions[] = "(pc.titel LIKE ? OR pc.product_code_leverancier LIKE ? OR pc.merk LIKE ?)";
                    $searchTermParam = "%$search_term%";
                    array_push($params, $searchTermParam, $searchTermParam, $searchTermParam);
                }

                if (!empty($supplier_id)) {
                    $whereConditions[] = "pc.leverancier_id = ?";
                    $params[] = $supplier_id;
                }
                if (!empty($category_id)) {
                    $whereConditions[] = "pc.grootboekrekening_id = ?";
                    $params[] = $category_id;
                }
                
                $whereClause = "WHERE " . implode(' AND ', $whereConditions);

                // Query voor totaal aantal items (voor paginatie)
                $totalSql = "SELECT COUNT(pc.product_id) FROM product_catalogus pc $whereClause";
                $totalStmt = $pdo->prepare($totalSql);
                $totalStmt->execute($params);
                $totalItems = $totalStmt->fetchColumn();
                $totalPages = ceil($totalItems / $perPage);

                // Query voor de daadwerkelijke data, nu met dynamische ORDER BY
                $dataSql = "$baseSql $whereClause ORDER BY $sort_by $sort_order LIMIT ? OFFSET ?";
                $dataStmt = $pdo->prepare($dataSql);
                
                $dataParams = $params;
                $dataParams[] = $perPage;
                $dataParams[] = $offset;
                
                $dataStmt->execute($dataParams);
                $products = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

                $result = [
                    'pagination' => [
                        'currentPage' => $page, 'totalPages' => (int)$totalPages,
                        'totalItems' => (int)$totalItems, 'perPage' => $perPage
                    ],
                    'data' => $products
                ];
            }
            break;
        
        // POST, PUT, DELETE cases blijven hier ongewijzigd

        default:
            http_response_code(405);
            $result = ['error' => 'Ongeldige request method'];
            break;
    }
    
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Serverfout bij producten API: ' . $e->getMessage()]);
}
?>
