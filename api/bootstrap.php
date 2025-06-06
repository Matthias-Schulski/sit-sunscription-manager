<?php
// api/bootstrap.php

// Vereis het databaseverbindingsbestand
require 'db.php';

// Stel de header in om aan te geven dat we JSON terugsturen
header('Content-Type: application/json');

// Een container voor alle data
$appData = [];

try {
    // Haal alle data op uit de verschillende tabellen
    // De $pdo variabele komt uit db.php
    $appData['klanten'] = $pdo->query('SELECT * FROM klanten')->fetchAll();
    $appData['abonnementen'] = $pdo->query('SELECT * FROM klant_diensten')->fetchAll();
    $appData['producten'] = $pdo->query('SELECT * FROM product_catalogus')->fetchAll();
    $appData['leveranciers'] = $pdo->query('SELECT * FROM leveranciers')->fetchAll();
    $appData['grootboekrekeningen'] = $pdo->query('SELECT * FROM grootboekrekeningen')->fetchAll();
    $appData['contactpersonen'] = $pdo->query('SELECT * FROM klant_contactpersonen')->fetchAll();
    
    // Voor de overige tabellen kun je later op dezelfde manier data toevoegen
    $appData['facturen'] = [];
    $appData['factuur_regels'] = [];
    $appData['variabel_verbruik'] = [];
    $appData['prijs_historie'] = [];
    
    // Instellingen (voor nu hardcoded, kan later uit DB komen)
    $appData['settings'] = [
        'bedrijfsnaam' => 'Mijn MSP (Live)',
        'btw_percentage' => 21
    ];

    // Converteer de PHP array naar een JSON string en stuur het terug
    echo json_encode($appData);

} catch (\PDOException $e) {
    // Stuur een HTTP 500 server error als er een databasefout optreedt
    http_response_code(500);
    echo json_encode(['error' => 'Databasefout: ' . $e->getMessage()]);
}
?>
