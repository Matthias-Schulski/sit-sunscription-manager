-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Gegenereerd op: 06 jun 2025 om 16:52
-- Serverversie: 10.6.22-MariaDB-0ubuntu0.22.04.1
-- PHP-versie: 8.1.2-1ubuntu2.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `SIT-Subscription-manager`
--

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `eenmalige_toevoegingen`
--

CREATE TABLE `eenmalige_toevoegingen` (
  `toevoeging_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `omschrijving` varchar(255) NOT NULL,
  `aantal` decimal(10,2) NOT NULL,
  `prijs_per_stuk` decimal(10,2) NOT NULL,
  `factureren_op_factuur_van` date NOT NULL COMMENT 'Het script pakt deze op voor de factuur van deze maand/periode',
  `status` enum('open','verwerkt') NOT NULL DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `facturen`
--

CREATE TABLE `facturen` (
  `factuur_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `contact_id` int(11) DEFAULT NULL,
  `factuur_opzet_id` int(11) DEFAULT NULL,
  `rompslomp_invoice_id` varchar(255) DEFAULT NULL,
  `factuurnummer` varchar(255) DEFAULT NULL,
  `factuurdatum` date DEFAULT NULL,
  `periode_start` date DEFAULT NULL,
  `periode_eind` date DEFAULT NULL,
  `status` enum('concept','wacht_op_data','klaar_voor_facturatie','gefactureerd','gepauzeerd') NOT NULL DEFAULT 'concept',
  `totaal_ex_btw` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `factuur_opzetten`
--

CREATE TABLE `factuur_opzetten` (
  `opzet_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `naam` varchar(255) NOT NULL COMMENT 'Bv: "VoIP Factuur", "Algemene Diensten Factuur"',
  `template_titel` varchar(255) DEFAULT NULL,
  `template_beschrijving` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `factuur_regels`
--

CREATE TABLE `factuur_regels` (
  `regel_id` int(11) NOT NULL,
  `factuur_id` int(11) NOT NULL,
  `klant_dienst_id` int(11) DEFAULT NULL COMMENT 'Link naar de vaste dienst',
  `uur_registratie_id` int(11) DEFAULT NULL COMMENT 'Link naar geboekte uren',
  `variabel_verbruik_id` int(11) DEFAULT NULL COMMENT 'Link naar verbruiksdata',
  `omschrijving` varchar(255) NOT NULL,
  `aantal` decimal(10,2) NOT NULL,
  `prijs_per_stuk` decimal(10,4) NOT NULL,
  `korting_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `regel_totaal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `grootboekrekeningen`
--

CREATE TABLE `grootboekrekeningen` (
  `grootboek_id` int(11) NOT NULL,
  `rompslomp_account_id` varchar(255) NOT NULL,
  `naam` varchar(255) NOT NULL,
  `path_name` varchar(255) DEFAULT NULL,
  `path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `klanten`
--

CREATE TABLE `klanten` (
  `klant_id` int(11) NOT NULL,
  `rompslomp_client_id` varchar(255) NOT NULL,
  `bedrijfsnaam` varchar(255) NOT NULL,
  `adres` varchar(255) DEFAULT NULL,
  `postcode` varchar(20) DEFAULT NULL,
  `plaats` varchar(255) DEFAULT NULL,
  `is_particulier` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=Bedrijf, 1=Particulier',
  `kvk_nummer` varchar(50) DEFAULT NULL,
  `btw_nummer` varchar(50) DEFAULT NULL,
  `klantnummer_rompslomp` varchar(50) DEFAULT NULL,
  `routit_klantnummer` varchar(255) DEFAULT NULL,
  `dsd_klantnummer` varchar(255) DEFAULT NULL,
  `overige_klantnummers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`overige_klantnummers`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `klant_bundels`
--

CREATE TABLE `klant_bundels` (
  `bundel_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `bundel_naam` varchar(255) NOT NULL,
  `bundel_prijs` decimal(10,2) NOT NULL,
  `omschrijving` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `klant_contactpersonen`
--

CREATE TABLE `klant_contactpersonen` (
  `contact_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `is_primair_contact` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Markeert het contact dat vanuit Rompslomp wordt gesynchroniseerd',
  `naam` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telefoon` varchar(50) DEFAULT NULL,
  `functie` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `klant_diensten`
--

CREATE TABLE `klant_diensten` (
  `klant_dienst_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `bundel_id` int(11) DEFAULT NULL,
  `factuur_opzet_id` int(11) DEFAULT NULL COMMENT 'Indien NULL, valt op de standaard factuur',
  `aantal` decimal(10,2) NOT NULL DEFAULT 1.00,
  `start_datum` date NOT NULL,
  `eind_datum` date DEFAULT NULL COMMENT 'NULL betekent doorlopend',
  `opgezegd_per_datum` date DEFAULT NULL,
  `actuele_verkoopprijs` decimal(10,2) NOT NULL,
  `actuele_inkoopprijs` decimal(10,4) NOT NULL,
  `aangepaste_titel` varchar(255) DEFAULT NULL,
  `aangepaste_omschrijving` text DEFAULT NULL,
  `factuur_offset` int(11) NOT NULL DEFAULT 0 COMMENT 'Aantal cycli vooruit (positief) of achteraf (negatief) factureren',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Voor unieke data zoals ICCID, telefoonnummer, licentiesleutel etc.' CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `leveranciers`
--

CREATE TABLE `leveranciers` (
  `leverancier_id` int(11) NOT NULL,
  `naam` varchar(255) NOT NULL,
  `api_endpoint` varchar(255) DEFAULT NULL,
  `api_credentials` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`api_credentials`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `prijs_historie`
--

CREATE TABLE `prijs_historie` (
  `historie_id` int(11) NOT NULL,
  `klant_dienst_id` int(11) NOT NULL,
  `wijzigings_datum` datetime NOT NULL,
  `oude_verkoopprijs` decimal(10,2) NOT NULL,
  `nieuwe_verkoopprijs` decimal(10,2) NOT NULL,
  `oud_aantal` decimal(10,2) NOT NULL,
  `nieuw_aantal` decimal(10,2) NOT NULL,
  `gewijzigd_door` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `product_catalogus`
--

CREATE TABLE `product_catalogus` (
  `product_id` int(11) NOT NULL,
  `leverancier_id` int(11) DEFAULT NULL,
  `grootboekrekening_id` int(11) DEFAULT NULL,
  `product_code_leverancier` varchar(255) DEFAULT NULL,
  `titel` varchar(255) NOT NULL,
  `merk` varchar(255) DEFAULT NULL,
  `categorie` varchar(255) DEFAULT NULL,
  `subcategorie` varchar(255) DEFAULT NULL,
  `standaard_inkoopprijs` decimal(10,4) NOT NULL DEFAULT 0.0000,
  `standaard_verkoopprijs` decimal(10,2) NOT NULL DEFAULT 0.00,
  `looptijd_maanden` int(11) NOT NULL DEFAULT 1,
  `facturatie_cyclus` enum('maandelijks','kwartaal','jaarlijks','eenmalig') NOT NULL DEFAULT 'maandelijks',
  `eenmalige_kosten_inkoop` decimal(10,2) NOT NULL DEFAULT 0.00,
  `eenmalige_kosten_verkoop` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('actief','end_of_sale','uitgefaseerd') NOT NULL DEFAULT 'actief',
  `is_variabel` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 voor producten met variabele kosten (bv. belkosten), 0 voor vaste kosten'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `uur_registraties`
--

CREATE TABLE `uur_registraties` (
  `uur_id` int(11) NOT NULL,
  `rompslomp_hour_id` int(11) NOT NULL,
  `klant_id` int(11) NOT NULL,
  `datum` date NOT NULL,
  `duur_in_uren` decimal(10,2) NOT NULL,
  `omschrijving` text DEFAULT NULL,
  `status` enum('open','gekoppeld_aan_factuur','gefactureerd') NOT NULL DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabelstructuur voor tabel `variabel_verbruik`
--

CREATE TABLE `variabel_verbruik` (
  `verbruik_id` int(11) NOT NULL,
  `klant_dienst_id` int(11) NOT NULL,
  `omschrijving` varchar(255) NOT NULL,
  `periode_start` date NOT NULL,
  `periode_eind` date NOT NULL,
  `aantal` decimal(10,4) NOT NULL,
  `eenheid` varchar(50) NOT NULL COMMENT 'Bv: minuten, GB, gesprekken',
  `kosten_per_eenheid` decimal(10,4) NOT NULL,
  `totaal_kosten` decimal(10,2) NOT NULL,
  `status` enum('ingevoerd','klaar_voor_facturatie','gefactureerd') NOT NULL DEFAULT 'ingevoerd'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexen voor geëxporteerde tabellen
--

--
-- Indexen voor tabel `eenmalige_toevoegingen`
--
ALTER TABLE `eenmalige_toevoegingen`
  ADD PRIMARY KEY (`toevoeging_id`),
  ADD KEY `fk_eenmalige_toevoegingen_klanten_idx` (`klant_id`);

--
-- Indexen voor tabel `facturen`
--
ALTER TABLE `facturen`
  ADD PRIMARY KEY (`factuur_id`),
  ADD KEY `fk_facturen_klanten_idx` (`klant_id`),
  ADD KEY `fk_facturen_opzet_idx` (`factuur_opzet_id`),
  ADD KEY `fk_facturen_contactpersonen_idx` (`contact_id`);

--
-- Indexen voor tabel `factuur_opzetten`
--
ALTER TABLE `factuur_opzetten`
  ADD PRIMARY KEY (`opzet_id`),
  ADD KEY `fk_factuur_opzetten_klanten_idx` (`klant_id`);

--
-- Indexen voor tabel `factuur_regels`
--
ALTER TABLE `factuur_regels`
  ADD PRIMARY KEY (`regel_id`),
  ADD KEY `fk_factuur_regels_facturen_idx` (`factuur_id`),
  ADD KEY `fk_factuur_regels_klant_diensten_idx` (`klant_dienst_id`),
  ADD KEY `fk_factuur_regels_uur_registraties_idx` (`uur_registratie_id`),
  ADD KEY `fk_factuur_regels_verbruik_idx` (`variabel_verbruik_id`);

--
-- Indexen voor tabel `grootboekrekeningen`
--
ALTER TABLE `grootboekrekeningen`
  ADD PRIMARY KEY (`grootboek_id`),
  ADD UNIQUE KEY `rompslomp_account_id_UNIQUE` (`rompslomp_account_id`);

--
-- Indexen voor tabel `klanten`
--
ALTER TABLE `klanten`
  ADD PRIMARY KEY (`klant_id`),
  ADD UNIQUE KEY `rompslomp_client_id_UNIQUE` (`rompslomp_client_id`),
  ADD UNIQUE KEY `routit_klantnummer_UNIQUE` (`routit_klantnummer`),
  ADD UNIQUE KEY `dsd_klantnummer_UNIQUE` (`dsd_klantnummer`);

--
-- Indexen voor tabel `klant_bundels`
--
ALTER TABLE `klant_bundels`
  ADD PRIMARY KEY (`bundel_id`),
  ADD KEY `fk_klant_bundels_klanten_idx` (`klant_id`);

--
-- Indexen voor tabel `klant_contactpersonen`
--
ALTER TABLE `klant_contactpersonen`
  ADD PRIMARY KEY (`contact_id`),
  ADD KEY `fk_klant_contactpersonen_klanten_idx` (`klant_id`);

--
-- Indexen voor tabel `klant_diensten`
--
ALTER TABLE `klant_diensten`
  ADD PRIMARY KEY (`klant_dienst_id`),
  ADD KEY `fk_klant_diensten_klanten_idx` (`klant_id`),
  ADD KEY `fk_klant_diensten_producten_idx` (`product_id`),
  ADD KEY `fk_klant_diensten_bundels_idx` (`bundel_id`),
  ADD KEY `fk_klant_diensten_opzet_idx` (`factuur_opzet_id`);

--
-- Indexen voor tabel `leveranciers`
--
ALTER TABLE `leveranciers`
  ADD PRIMARY KEY (`leverancier_id`);

--
-- Indexen voor tabel `prijs_historie`
--
ALTER TABLE `prijs_historie`
  ADD PRIMARY KEY (`historie_id`),
  ADD KEY `fk_prijs_historie_klant_diensten_idx` (`klant_dienst_id`);

--
-- Indexen voor tabel `product_catalogus`
--
ALTER TABLE `product_catalogus`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `fk_product_catalogus_leveranciers_idx` (`leverancier_id`),
  ADD KEY `fk_product_catalogus_grootboek_idx` (`grootboekrekening_id`);

--
-- Indexen voor tabel `uur_registraties`
--
ALTER TABLE `uur_registraties`
  ADD PRIMARY KEY (`uur_id`),
  ADD UNIQUE KEY `rompslomp_hour_id_UNIQUE` (`rompslomp_hour_id`),
  ADD KEY `fk_uur_registraties_klanten_idx` (`klant_id`);

--
-- Indexen voor tabel `variabel_verbruik`
--
ALTER TABLE `variabel_verbruik`
  ADD PRIMARY KEY (`verbruik_id`),
  ADD KEY `fk_variabel_verbruik_klant_diensten_idx` (`klant_dienst_id`);

--
-- AUTO_INCREMENT voor geëxporteerde tabellen
--

--
-- AUTO_INCREMENT voor een tabel `eenmalige_toevoegingen`
--
ALTER TABLE `eenmalige_toevoegingen`
  MODIFY `toevoeging_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `facturen`
--
ALTER TABLE `facturen`
  MODIFY `factuur_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `factuur_opzetten`
--
ALTER TABLE `factuur_opzetten`
  MODIFY `opzet_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `factuur_regels`
--
ALTER TABLE `factuur_regels`
  MODIFY `regel_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `grootboekrekeningen`
--
ALTER TABLE `grootboekrekeningen`
  MODIFY `grootboek_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `klanten`
--
ALTER TABLE `klanten`
  MODIFY `klant_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `klant_bundels`
--
ALTER TABLE `klant_bundels`
  MODIFY `bundel_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `klant_contactpersonen`
--
ALTER TABLE `klant_contactpersonen`
  MODIFY `contact_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `klant_diensten`
--
ALTER TABLE `klant_diensten`
  MODIFY `klant_dienst_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `leveranciers`
--
ALTER TABLE `leveranciers`
  MODIFY `leverancier_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `prijs_historie`
--
ALTER TABLE `prijs_historie`
  MODIFY `historie_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `product_catalogus`
--
ALTER TABLE `product_catalogus`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `uur_registraties`
--
ALTER TABLE `uur_registraties`
  MODIFY `uur_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT voor een tabel `variabel_verbruik`
--
ALTER TABLE `variabel_verbruik`
  MODIFY `verbruik_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Beperkingen voor geëxporteerde tabellen
--

--
-- Beperkingen voor tabel `eenmalige_toevoegingen`
--
ALTER TABLE `eenmalige_toevoegingen`
  ADD CONSTRAINT `fk_eenmalige_toevoegingen_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `facturen`
--
ALTER TABLE `facturen`
  ADD CONSTRAINT `fk_facturen_contactpersonen` FOREIGN KEY (`contact_id`) REFERENCES `klant_contactpersonen` (`contact_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_facturen_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_facturen_opzet` FOREIGN KEY (`factuur_opzet_id`) REFERENCES `factuur_opzetten` (`opzet_id`) ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `factuur_opzetten`
--
ALTER TABLE `factuur_opzetten`
  ADD CONSTRAINT `fk_factuur_opzetten_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `factuur_regels`
--
ALTER TABLE `factuur_regels`
  ADD CONSTRAINT `fk_factuur_regels_facturen` FOREIGN KEY (`factuur_id`) REFERENCES `facturen` (`factuur_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_factuur_regels_klant_diensten` FOREIGN KEY (`klant_dienst_id`) REFERENCES `klant_diensten` (`klant_dienst_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_factuur_regels_uur_registraties` FOREIGN KEY (`uur_registratie_id`) REFERENCES `uur_registraties` (`uur_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_factuur_regels_verbruik` FOREIGN KEY (`variabel_verbruik_id`) REFERENCES `variabel_verbruik` (`verbruik_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `klant_bundels`
--
ALTER TABLE `klant_bundels`
  ADD CONSTRAINT `fk_klant_bundels_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `klant_contactpersonen`
--
ALTER TABLE `klant_contactpersonen`
  ADD CONSTRAINT `fk_klant_contactpersonen_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `klant_diensten`
--
ALTER TABLE `klant_diensten`
  ADD CONSTRAINT `fk_klant_diensten_bundels` FOREIGN KEY (`bundel_id`) REFERENCES `klant_bundels` (`bundel_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_klant_diensten_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_klant_diensten_opzet` FOREIGN KEY (`factuur_opzet_id`) REFERENCES `factuur_opzetten` (`opzet_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_klant_diensten_producten` FOREIGN KEY (`product_id`) REFERENCES `product_catalogus` (`product_id`) ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `prijs_historie`
--
ALTER TABLE `prijs_historie`
  ADD CONSTRAINT `fk_prijs_historie_klant_diensten` FOREIGN KEY (`klant_dienst_id`) REFERENCES `klant_diensten` (`klant_dienst_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `product_catalogus`
--
ALTER TABLE `product_catalogus`
  ADD CONSTRAINT `fk_product_catalogus_grootboek` FOREIGN KEY (`grootboekrekening_id`) REFERENCES `grootboekrekeningen` (`grootboek_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_product_catalogus_leveranciers` FOREIGN KEY (`leverancier_id`) REFERENCES `leveranciers` (`leverancier_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `uur_registraties`
--
ALTER TABLE `uur_registraties`
  ADD CONSTRAINT `fk_uur_registraties_klanten` FOREIGN KEY (`klant_id`) REFERENCES `klanten` (`klant_id`) ON UPDATE CASCADE;

--
-- Beperkingen voor tabel `variabel_verbruik`
--
ALTER TABLE `variabel_verbruik`
  ADD CONSTRAINT `fk_variabel_verbruik_klant_diensten` FOREIGN KEY (`klant_dienst_id`) REFERENCES `klant_diensten` (`klant_dienst_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
