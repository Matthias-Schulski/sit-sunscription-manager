<?php
// api/db.php

// --- DATABASE CONFIGURATIE ---
// Pas deze gegevens aan naar jouw lokale MySQL-omgeving.
$host = '192.168.178.10';       // of 'localhost'
$db   = 'SIT-Subscription-manager'; // De databasenaam uit je .sql bestand
$user = 'sit_db_web_user';            // Standaard gebruikersnaam voor lokale XAMPP/MAMP
$pass = 'April@2003!';                // Standaard wachtwoord is leeg voor lokale XAMPP/MAMP
$charset = 'utf8mb4';

// Data Source Name (DSN)
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

// Opties voor PDO (PHP Data Objects) voor een stabiele verbinding
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Gooi een exception bij fouten
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Haal data op als associatieve array
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Gebruik echte prepared statements
];

try {
    // Probeer een nieuwe PDO instance (databaseverbinding) aan te maken
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Als de verbinding mislukt, toon een foutmelding en stop het script
    // In een productieomgeving zou je hier een generiekere foutmelding tonen.
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

// De $pdo variabele is nu beschikbaar voor elk script dat dit bestand includeert.
?>
