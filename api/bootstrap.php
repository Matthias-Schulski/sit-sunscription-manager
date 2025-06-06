<?php
// api/bootstrap.php

require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

// Een container voor alle data die nodig is bij de start van de app
$appData = [];

try {
    // Gebruik PDO::FETCH_ASSOC om alleen associatieve arrays terug te krijgen
    $appData['klanten'] = $pdo->query('SELECT * FROM klanten ORDER BY bedrijfsnaam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['abonnementen'] = $pdo->query('SELECT * FROM klant_diensten')->fetchAll(PDO::FETCH_ASSOC);
    $appData['producten'] = $pdo->query('SELECT * FROM product_catalogus ORDER BY titel')->fetchAll(PDO::FETCH_ASSOC);
    $appData['leveranciers'] = $pdo->query('SELECT * FROM leveranciers ORDER BY naam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['grootboekrekeningen'] = $pdo->query('SELECT * FROM grootboekrekeningen ORDER BY naam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['contactpersonen'] = $pdo->query('SELECT * FROM klant_contactpersonen')->fetchAll(PDO::FETCH_ASSOC);
    $appData['facturen'] = $pdo->query('SELECT * FROM facturen')->fetchAll(PDO::FETCH_ASSOC);
    
    // Lege arrays voor data die later geladen wordt, zodat de JS app niet breekt
    $appData['factuur_regels'] = [];
    $appData['variabel_verbruik'] = [];
    $appData['prijs_historie'] = [];
    
    // Instellingen
    $appData['settings'] = [
        'bedrijfsnaam' => 'Mijn MSP (Live)',
        'btw_percentage' => 21
    ];

    echo json_encode($appData);

} catch (\PDOException $e) {
    http_response_code(500);
    // Geef een duidelijke JSON foutmelding terug die de frontend kan tonen
    echo json_encode(['error' => 'Databasefout bij initialisatie: ' . $e->getMessage()]);
    // Stop de uitvoering om te voorkomen dat er corrupte data wordt gestuurd
    exit();
}
?>
