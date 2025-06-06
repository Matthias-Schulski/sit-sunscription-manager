<?php
// api/bootstrap.php

// Vereis het databaseverbindingsbestand
require 'db.php';

// Stel de header in om aan te geven dat we JSON terugsturen
header('Content-Type: application/json');

// Een container voor alle data
$appData = [];

try {
    // Haal alle data op uit de verschillende tabellen.
    // Dit is nodig voor de eerste 'paint' van de applicatie.
    // De $pdo variabele komt uit db.php
    $appData['klanten'] = $pdo->query('SELECT * FROM klanten ORDER BY bedrijfsnaam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['abonnementen'] = $pdo->query('SELECT * FROM klant_diensten')->fetchAll(PDO::FETCH_ASSOC);
    $appData['producten'] = $pdo->query('SELECT * FROM product_catalogus ORDER BY titel')->fetchAll(PDO::FETCH_ASSOC);
    $appData['leveranciers'] = $pdo->query('SELECT * FROM leveranciers ORDER BY naam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['grootboekrekeningen'] = $pdo->query('SELECT * FROM grootboekrekeningen ORDER BY naam')->fetchAll(PDO::FETCH_ASSOC);
    $appData['contactpersonen'] = $pdo->query('SELECT * FROM klant_contactpersonen')->fetchAll(PDO::FETCH_ASSOC);
    $appData['facturen'] = $pdo->query('SELECT * FROM facturen')->fetchAll(PDO::FETCH_ASSOC);
    
    // Deze blijven leeg voor nu, maar de keys moeten bestaan in de JS app
    $appData['factuur_regels'] = [];
    $appData['variabel_verbruik'] = [];
    $appData['prijs_historie'] = [];
    
    // Instellingen (voor nu hardcoded, kan later uit een 'settings' tabel in de DB komen)
    $appData['settings'] = [
        'bedrijfsnaam' => 'Mijn MSP (Live)',
        'btw_percentage' => 21
    ];

    // Converteer de PHP array naar een JSON string en stuur het terug
    echo json_encode($appData);

} catch (\PDOException $e) {
    // Stuur een HTTP 500 server error als er een databasefout optreedt
    http_response_code(500);
    echo json_encode(['error' => 'Databasefout bij initialisatie: ' . $e->getMessage()]);
}
?>
