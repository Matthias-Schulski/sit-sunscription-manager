document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONFIGURATION ---
    const config = {
        apiUrl: '/api/' // Pas dit aan naar de URL van je PHP-backend
    };

    // --- MOCK DATABASE (Fallback) ---
    const mockDatabase = {
        klanten: [
            { klant_id: 1, bedrijfsnaam: 'Schoonmaakbedrijf De Wit', adres: 'Dorpsstraat 12', postcode: '1234 AB', plaats: 'Amsterdam', rompslomp_client_id: 'RMP1001' },
            { klant_id: 2, bedrijfsnaam: 'Advocatenkantoor Jansen & Co', adres: 'Plein 4', postcode: '5678 CD', plaats: 'Utrecht', rompslomp_client_id: 'RMP1002' },
            { klant_id: 3, bedrijfsnaam: 'Frietzaak "De Puntzak"', adres: 'Hoekstraat 1', postcode: '3005 BA', plaats: 'Rotterdam', rompslomp_client_id: 'RMP1005' },
        ],
        abonnementen: [
            { klant_dienst_id: 1, klant_id: 1, product_id: 1, aantal: 5, actuele_verkoopprijs: 11.70, start_datum: '2023-01-01', opgezegd_per_datum: null },
            { klant_dienst_id: 2, klant_id: 1, product_id: 2, aantal: 1, actuele_verkoopprijs: 7.50, start_datum: '2025-05-15', opgezegd_per_datum: null }, // Start in the past for pro-rata testing
            { klant_dienst_id: 3, klant_id: 2, product_id: 3, aantal: 1, actuele_verkoopprijs: 25.00, start_datum: '2022-11-01', opgezegd_per_datum: null },
            { klant_dienst_id: 4, klant_id: 2, product_id: 5, aantal: 1, actuele_verkoopprijs: 65.00, start_datum: '2024-07-01', opgezegd_per_datum: null },
            { klant_dienst_id: 5, klant_id: 3, product_id: 4, aantal: 1, actuele_verkoopprijs: 15.00, start_datum: '2024-01-01', opgezegd_per_datum: '2025-01-01' },
            { klant_dienst_id: 6, klant_id: 1, product_id: 6, aantal: 1, actuele_verkoopprijs: 0, start_datum: '2024-01-01', opgezegd_per_datum: null },
        ],
        producten: [
            { product_id: 1, titel: 'Microsoft 365 Business Standard', leverancier_id: 2, grootboekrekening_id: 1, standaard_inkoopprijs: 9.80, standaard_verkoopprijs: 11.70, facturatie_cyclus: 'maandelijks', factuur_offset: 0, status: 'actief', is_variabel: false },
            { product_id: 2, titel: 'Acronis Cloud Backup 10GB', leverancier_id: 3, grootboekrekening_id: 2, standaard_inkoopprijs: 4.50, standaard_verkoopprijs: 7.50, facturatie_cyclus: 'maandelijks', factuur_offset: 0, status: 'actief', is_variabel: false },
            { product_id: 3, titel: 'VoIP Telefoniecentrale', leverancier_id: 1, grootboekrekening_id: 3, standaard_inkoopprijs: 18.00, standaard_verkoopprijs: 25.00, facturatie_cyclus: 'maandelijks', factuur_offset: 1, status: 'actief', is_variabel: false },
            { product_id: 4, titel: 'Domeinnaam .NL', leverancier_id: 1, grootboekrekening_id: 4, standaard_inkoopprijs: 3.95, standaard_verkoopprijs: 10.00, facturatie_cyclus: 'jaarlijks', factuur_offset: 1, status: 'end_of_sale', is_variabel: false },
            { product_id: 5, titel: 'Zakelijk Glasvezel', leverancier_id: 4, grootboekrekening_id: 5, standaard_inkoopprijs: 45.00, standaard_verkoopprijs: 65.00, facturatie_cyclus: 'maandelijks', factuur_offset: 0, status: 'actief', is_variabel: false },
            { product_id: 6, titel: 'Belminuten Variabel', leverancier_id: 1, grootboekrekening_id: 3, standaard_inkoopprijs: 0, standaard_verkoopprijs: 0, facturatie_cyclus: 'maandelijks', factuur_offset: -1, status: 'actief', is_variabel: true },
        ],
        leveranciers: [
            { leverancier_id: 1, naam: 'Handmatig' }, { leverancier_id: 2, naam: 'DSD Europe' }, { leverancier_id: 3, naam: 'Acronis' }, { leverancier_id: 4, naam: 'RoutIT' }
        ],
        grootboekrekeningen: [
            { grootboek_id: 1, naam: 'Omzet Software' }, { grootboek_id: 2, naam: 'Omzet Backup' }, { grootboek_id: 3, naam: 'Omzet VoIP' }, { grootboek_id: 4, naam: 'Omzet Domeinen' }, { grootboek_id: 5, naam: 'Omzet Connectiviteit' }
        ],
        contactpersonen: [
            { contact_id: 1, klant_id: 1, naam: 'Jan de Wit', email: 'jan@dewit.nl', telefoon: '0612345678', is_primair_contact: true },
            { contact_id: 2, klant_id: 2, naam: 'Mr. Jansen', email: 'jansen@advocaten.nl', telefoon: '030-1234567', is_primair_contact: true },
            { contact_id: 3, klant_id: 2, naam: 'Mevr. de Vries', email: 'devries@advocaten.nl', telefoon: '030-1234568', is_primair_contact: false },
        ],
        facturen: [],
        factuur_regels: [],
        variabel_verbruik: [],
        prijs_historie: [],
        settings: { bedrijfsnaam: 'Mijn MSP', btw_percentage: 21 },
    };

    // --- GLOBAL STATE ---
    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    let appData = {};
    const privacySettings = { clients: null, finance: null, margins: null };

    // --- UTILS ---
    const formatCurrency = (amount) => `€ ${amount.toFixed(2).replace('.', ',')}`;
    
    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.prepend(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOutToast 0.5s forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
    
    const apiDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

    // --- INITIALIZATION ---
    async function initializeApp() {
        loadPrivacySettings();
        try {
            // const response = await fetch(config.apiUrl + 'bootstrap.php');
            // if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            // appData = await response.json();
            await apiDelay(500);
            appData = JSON.parse(JSON.stringify(mockDatabase));
            console.log("Successfully initialized with mock data.");
        } catch (error) {
            console.error("Could not connect to API, using mock data.", error);
            document.getElementById('error-banner').classList.remove('hidden');
            appData = JSON.parse(JSON.stringify(mockDatabase));
        }
        window.addEventListener('hashchange', navigate);
        addGlobalEventListeners();
        navigate();
    }

    // --- PRIVACY & NAVIGATION ---
    function loadPrivacySettings() {
        const params = new URLSearchParams(window.location.search);
        privacySettings.clients = params.get('clients');
        privacySettings.finance = params.get('finance');
        privacySettings.margins = params.get('margins');
    }

    function getPrivacyQueryString() {
        const params = new URLSearchParams();
        if (privacySettings.clients) params.set('clients', privacySettings.clients);
        if (privacySettings.finance) params.set('finance', privacySettings.finance);
        if (privacySettings.margins) params.set('margins', privacySettings.margins);
        return params.toString() ? `?${params.toString()}` : '';
    }
    
    function updateAllLinks() {
        const queryString = getPrivacyQueryString();
        document.querySelectorAll('a.nav-link').forEach(link => {
            if (!link.href) return;
            const url = new URL(link.href, window.location.origin);
            link.href = `${url.pathname}${queryString}${url.hash}`;
        });
    }

    // --- ROUTER ---
    const routes = {
        '#dashboard': 'pages/dashboard.html',
        '#klanten': 'pages/klanten.html',
        '#klant-detail': 'pages/klant-detail.html',
        '#producten': 'pages/producten.html',
        '#facturatie': 'pages/facturatie.html',
        '#instellingen': 'pages/instellingen.html'
    };

    async function navigate() {
        const path = window.location.hash || '#dashboard';
        const pathParts = path.split('/');
        const page = pathParts[0];
        const id = pathParts[1];
        const routePath = routes[page];

        if (!routePath) {
            mainContent.innerHTML = `<h1 class="text-red-500">Error: Pagina niet gevonden.</h1>`;
            return;
        }

        mainContent.innerHTML = `<div class="text-center text-slate-500"><i class="fas fa-spinner fa-spin fa-2x"></i></div>`;
        
        try {
            const response = await fetch(routePath);
            if (!response.ok) throw new Error(`Pagina template niet gevonden: ${routePath}`);
            mainContent.innerHTML = await response.text();

            const setupFunctions = {
                '#dashboard': setupDashboardPage,
                '#klanten': setupKlantenPage,
                '#klant-detail': () => renderKlantDetailPage(id),
                '#producten': setupProductenPage,
                '#facturatie': setupFacturatiePage,
                '#instellingen': setupInstellingenPage,
            };
            
            if (setupFunctions[page]) setupFunctions[page]();
            
        } catch (error) {
            mainContent.innerHTML = `<h1 class="text-red-500">${error.message}</h1>`;
        }
        
        document.querySelectorAll('#nav-menu .nav-link').forEach(link => {
            const linkHash = new URL(link.href, window.location.origin).hash;
            link.classList.toggle('active', linkHash.startsWith(page));
        });
        
        updateAllLinks();
    }
    
    // --- PAGE SETUP & RENDERING ---
    function setupDashboardPage() {
        document.getElementById('dashboard-klanten').textContent = appData.klanten.length;
        const activeSubs = appData.abonnementen.filter(s => !s.opgezegd_per_datum || new Date(s.opgezegd_per_datum) > new Date());
        document.getElementById('dashboard-subs').textContent = activeSubs.length;
        
        const totalMrr = activeSubs
            .filter(sub => {
                const product = appData.producten.find(p => p.product_id === sub.product_id);
                return product && product.facturatie_cyclus === 'maandelijks';
            })
            .reduce((sum, sub) => sum + (sub.actuele_verkoopprijs * sub.aantal), 0);
        
        const mrrElement = document.getElementById('dashboard-mrr');
        if (privacySettings.finance === 'hidden') {
            mrrElement.textContent = '€ ****';
            document.getElementById('revenue-chart-wrapper').innerHTML = '<p class="text-center text-gray-500">Financiële data is verborgen.</p>';
        } else {
            mrrElement.textContent = formatCurrency(totalMrr);
            renderDashboardChart();
        }

        document.getElementById('dashboard-facturen-wacht').textContent = appData.facturen.filter(f => f.status === 'wacht_op_data').length;
        document.getElementById('dashboard-facturen-klaar').textContent = appData.facturen.filter(f => f.status === 'klaar_voor_verzending').length;
    }

    function renderDashboardChart() {
        const ctx = document.getElementById('revenueChart')?.getContext('2d');
        if (!ctx) return;
        new Chart(ctx, { type: 'line', data: {
            labels: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun'],
            datasets: [{ label: 'Omzet', data: [1250, 1900, 3100, 2800, 3900, 4250], borderColor: '#14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.1)', fill: true, tension: 0.4 }]
        }});
    }

    function setupKlantenPage() {
        const searchInput = document.getElementById('klantSearchInput');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = appData.klanten.filter(k => 
                k.bedrijfsnaam.toLowerCase().includes(searchTerm) || k.plaats.toLowerCase().includes(searchTerm)
            );
            renderKlantenTable(filtered);
        });
        renderKlantenTable(appData.klanten);
    }
    
    function renderKlantenTable(klanten) {
        const tableBody = document.getElementById('klantenTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        klanten.forEach(klant => {
            const abonnementenCount = appData.abonnementen.filter(a => a.klant_id === klant.klant_id).length;
            const row = document.createElement('tr');
            row.className = 'border-b';
            
            const bedrijfsnaam = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
            row.innerHTML = `
                <td class="p-3 font-medium text-gray-800">${bedrijfsnaam}</td>
                <td class="p-3">${privacySettings.clients === 'hidden' ? '****' : klant.plaats}</td>
                <td class="p-3">${abonnementenCount}</td>
                <td class="p-3 text-right">
                    <a href="${getPrivacyQueryString()}#klant-detail/${klant.klant_id}" class="nav-link text-slate-600 hover:text-slate-900 p-2" title="Details"><i class="fas fa-eye"></i></a>
                    <button data-action="open-klant-modal" data-id="${klant.klant_id}" class="text-slate-600 hover:text-slate-900 p-2" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                    <button data-action="delete-klant" data-id="${klant.klant_id}" class="text-red-500 hover:text-red-800 p-2" title="Verwijder"><i class="fas fa-trash"></i></button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    function setupProductenPage() {
        renderProductsTable(appData.producten);
        const searchInput = document.getElementById('productSearchInput');
        const supplierFilter = document.getElementById('productSupplierFilter');
        const categoryFilter = document.getElementById('productCategoryFilter');
        const suppliers = [...new Set(appData.producten.map(p => appData.leveranciers.find(l => l.leverancier_id === p.leverancier_id)?.naam || 'Onbekend'))];
        const categories = [...new Set(appData.producten.map(p => appData.grootboekrekeningen.find(g => g.grootboek_id === p.grootboekrekening_id)?.naam || 'Onbekend'))];
        supplierFilter.innerHTML = '<option value="">Alle Leveranciers</option>' + suppliers.map(s => `<option value="${s}">${s}</option>`).join('');
        categoryFilter.innerHTML = '<option value="">Alle Categorieën</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');

        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedSupplierName = supplierFilter.value;
            const selectedCategoryName = categoryFilter.value;

            const filtered = appData.producten.filter(p => {
                const leverancier = appData.leveranciers.find(l => l.leverancier_id === p.leverancier_id);
                const categorie = appData.grootboekrekeningen.find(g => g.grootboek_id === p.grootboekrekening_id);
                return (p.titel.toLowerCase().includes(searchTerm)) &&
                       (!selectedSupplierName || leverancier?.naam === selectedSupplierName) &&
                       (!selectedCategoryName || categorie?.naam === selectedCategoryName);
            });
            renderProductsTable(filtered);
        }
        searchInput.addEventListener('input', applyFilters);
        supplierFilter.addEventListener('change', applyFilters);
        categoryFilter.addEventListener('change', applyFilters);
    }
    
    function renderProductsTable(products) {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        products.forEach(p => {
            const leverancier = appData.leveranciers.find(l => l.leverancier_id === p.leverancier_id)?.naam || 'N/A';
            const categorie = appData.grootboekrekeningen.find(g => g.grootboek_id === p.grootboekrekening_id)?.naam || 'N/A';
            const isEndOfSale = p.status === 'end_of_sale';
            const prijsText = privacySettings.finance === 'hidden' ? '€ ****' : formatCurrency(p.standaard_verkoopprijs);
            const row = document.createElement('tr');
            row.className = 'border-b';
            row.innerHTML = `
                <td class="p-3 font-medium text-gray-800">${p.titel}</td>
                <td class="p-3">${leverancier}</td>
                <td class="p-3">${categorie}</td>
                <td class="p-3">${prijsText}</td>
                <td class="p-3"><span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${isEndOfSale ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">${p.status}</span></td>
                <td class="p-3 text-right">
                    <button data-action="open-product-modal" data-id="${p.product_id}" class="text-slate-600 hover:text-slate-900 p-2" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                    <button data-action="delete-product" data-id="${p.product_id}" class="text-red-500 hover:text-red-800 p-2" title="Verwijder"><i class="fas fa-trash"></i></button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    function setupFacturatiePage() {
        document.getElementById('generateInvoicesBtn').addEventListener('click', handleGenerateInvoices);
        renderFacturatieTabsAndTable();
    }

    function setupInstellingenPage() {
        const form = document.getElementById('settingsForm');
        form.elements['setting-bedrijfsnaam'].value = appData.settings.bedrijfsnaam;
        form.elements['setting-btw'].value = appData.settings.btw_percentage;
        renderMasterDataTable('leveranciers');
    }

    // --- MODALS and CRUD Logic ---
    function openModal(innerHTML, size = 'max-w-2xl') {
        const modalHTML = `
            <div class="modal" style="display:block;">
                <div class="modal-content bg-white p-8 rounded-lg shadow-xl w-full ${size}">
                    ${innerHTML}
                </div>
            </div>`;
        modalContainer.innerHTML = modalHTML;
    }

    function closeModal() {
        modalContainer.innerHTML = '';
    }

    async function handleCrudSubmit(dataType, idField, form) {
        await apiDelay();
        const formData = new FormData(form);
        const id = formData.get(idField);
        let entry = id ? appData[dataType].find(item => item[idField] == id) : {};

        for (let [key, value] of formData.entries()) {
            if (key === idField && !value) continue;

            const numValue = parseFloat(value);
            if (!isNaN(numValue) && value.trim() !== '') {
                entry[key] = numValue;
            } else if (value === 'true' || value === 'false') {
                entry[key] = value === 'true';
            } else {
                entry[key] = value;
            }
        }
        
        if (id) {
            const index = appData[dataType].findIndex(item => item[idField] == id);
            appData[dataType][index] = entry;
        } else {
            entry[idField] = Date.now();
            if (dataType === 'abonnementen') {
                const product = appData.producten.find(p => p.product_id == entry.product_id);
                entry.actuele_verkoopprijs = product.standaard_verkoopprijs;
            }
            appData[dataType].push(entry);
        }
        
        showToast(`${dataType.slice(0, -1)} opgeslagen!`);
        closeModal();
        if (dataType === 'abonnementen' || dataType === 'contactpersonen') {
            renderKlantDetailPage(entry.klant_id);
        } else {
            navigate();
        }
    }
    
    async function handleDelete(dataType, id, idField, message) {
        if (confirm(message)) {
            await apiDelay();
            appData[dataType] = appData[dataType].filter(item => item[idField] != id);
            showToast(`${dataType.slice(0, -1)} verwijderd!`);
            if (dataType === 'abonnementen' || dataType === 'contactpersonen') {
                renderKlantDetailPage(window.location.hash.split('/')[1]);
            } else {
                navigate();
            }
        }
    }

    function openKlantModal(id = null) {
        const klant = id ? appData.klanten.find(k => k.klant_id == id) : {};
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${id ? 'Klant Wijzigen' : 'Nieuwe Klant'}</h2>
            <form id="klantForm">
                <input type="hidden" name="klant_id" value="${klant?.klant_id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">Bedrijfsnaam</label><input type="text" name="bedrijfsnaam" value="${klant?.bedrijfsnaam || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                    <div><label class="block text-sm font-medium">Rompslomp ID</label><input type="text" name="rompslomp_client_id" value="${klant?.rompslomp_client_id || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Adres</label><input type="text" name="adres" value="${klant?.adres || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Postcode</label><input type="text" name="postcode" value="${klant?.postcode || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Plaats</label><input type="text" name="plaats" value="${klant?.plaats || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Opslaan</button></div>
            </form>`;
        openModal(modalHTML);
    }
    
    function openProductModal(id = null) {
        const product = id ? appData.producten.find(p => p.product_id == id) : {};
        const leverancierOptions = appData.leveranciers.map(l => `<option value="${l.leverancier_id}" ${product?.leverancier_id == l.leverancier_id ? 'selected' : ''}>${l.naam}</option>`).join('');
        const grootboekOptions = appData.grootboekrekeningen.map(g => `<option value="${g.grootboek_id}" ${product?.grootboekrekening_id == g.grootboek_id ? 'selected' : ''}>${g.naam}</option>`).join('');

        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${id ? 'Product Wijzigen' : 'Nieuw Product'}</h2>
            <form id="productForm">
                <input type="hidden" name="product_id" value="${product?.product_id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Titel</label><input type="text" name="titel" value="${product?.titel || ''}" class="mt-1 block w-full rounded-md" required></div>
                    
                    <div><label class="block text-sm font-medium">Leverancier</label><select name="leverancier_id" class="mt-1 block w-full rounded-md">${leverancierOptions}</select></div>
                    <div><label class="block text-sm font-medium">Grootboekrekening</label><select name="grootboekrekening_id" class="mt-1 block w-full rounded-md">${grootboekOptions}</select></div>

                    <div><label class="block text-sm font-medium">Standaard Verkoopprijs</label><input type="number" step="0.01" name="standaard_verkoopprijs" value="${product?.standaard_verkoopprijs || 0}" class="mt-1 block w-full rounded-md"></div>
                    <div class="${privacySettings.margins === 'hidden' ? 'hidden' : ''}"><label class="block text-sm font-medium">Standaard Inkoopprijs</label><input type="number" step="0.01" name="standaard_inkoopprijs" value="${product?.standaard_inkoopprijs || 0}" class="mt-1 block w-full rounded-md"></div>
                    
                    <div><label class="block text-sm font-medium">Facturatiecyclus</label><select name="facturatie_cyclus" class="mt-1 block w-full rounded-md"><option value="maandelijks" ${product?.facturatie_cyclus === 'maandelijks' ? 'selected' : ''}>Maandelijks</option><option value="kwartaal" ${product?.facturatie_cyclus === 'kwartaal' ? 'selected' : ''}>Per Kwartaal</option><option value="jaarlijks" ${product?.facturatie_cyclus === 'jaarlijks' ? 'selected' : ''}>Jaarlijks</option></select></div>
                    <div><label class="block text-sm font-medium">Factuur Offset (maanden)</label><input type="number" name="factuur_offset" value="${product?.factuur_offset || 0}" class="mt-1 block w-full rounded-md" title="0 = in periode, 1 = 1 maand vooruit, -1 = 1 maand achteraf"></div>

                    <div><label class="block text-sm font-medium">Status</label><select name="status" class="mt-1 block w-full rounded-md"><option value="actief" ${product?.status === 'actief' ? 'selected' : ''}>Actief</option><option value="end_of_sale" ${product?.status === 'end_of_sale' ? 'selected' : ''}>End of Sale</option></select></div>
                    <div><label class="block text-sm font-medium">Type</label><select name="is_variabel" class="mt-1 block w-full rounded-md"><option value="false" ${!product?.is_variabel ? 'selected' : ''}>Vaste Prijs</option><option value="true" ${product?.is_variabel ? 'selected' : ''}>Variabel Verbruik</option></select></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Opslaan</button></div>
            </form>`;
        openModal(modalHTML);
    }
    
    function openAbonnementModal(klantId, abonnementId = null) {
        const abonnement = abonnementId ? appData.abonnementen.find(a => a.klant_dienst_id == abonnementId) : {};
        const productOptions = appData.producten.filter(p => p.status === 'actief').map(p => `<option value="${p.product_id}" ${abonnement?.product_id == p.product_id ? 'selected' : ''}>${p.titel}</option>`).join('');

        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${abonnementId ? 'Abonnement Wijzigen' : 'Nieuw Abonnement'}</h2>
            <form id="abonnementForm">
                <input type="hidden" name="klant_dienst_id" value="${abonnement?.klant_dienst_id || ''}">
                <input type="hidden" name="klant_id" value="${klantId}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">Product</label><select name="product_id" class="mt-1 block w-full rounded-md" ${abonnementId ? 'disabled' : ''}>${productOptions}</select></div>
                    <div><label class="block text-sm font-medium">Startdatum</label><input type="date" name="start_datum" value="${abonnement?.start_datum || new Date().toISOString().split('T')[0]}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Aantal</label><input type="number" name="aantal" value="${abonnement?.aantal || 1}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Verkoopprijs per stuk</label><input type="number" step="0.01" name="actuele_verkoopprijs" value="${abonnement?.actuele_verkoopprijs || 0}" class="mt-1 block w-full rounded-md"></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Opslaan</button></div>
            </form>`;
        openModal(modalHTML);
    }
    
    function openContactModal(klantId, contactId = null) {
        const contact = contactId ? appData.contactpersonen.find(c => c.contact_id == contactId) : {};
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${contactId ? 'Contactpersoon Wijzigen' : 'Nieuwe Contactpersoon'}</h2>
            <form id="contactForm">
                <input type="hidden" name="contact_id" value="${contact?.contact_id || ''}">
                <input type="hidden" name="klant_id" value="${klantId}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label class="block text-sm font-medium">Naam</label><input type="text" name="naam" value="${contact?.naam || ''}" class="mt-1 block w-full rounded-md" required></div>
                    <div><label class="block text-sm font-medium">Email</label><input type="email" name="email" value="${contact?.email || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Telefoon</label><input type="tel" name="telefoon" value="${contact?.telefoon || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div class="flex items-center"><input type="checkbox" name="is_primair_contact" value="true" ${contact?.is_primair_contact ? 'checked' : ''} class="h-4 w-4 rounded"><label class="ml-2 text-sm">Primair contactpersoon</label></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Opslaan</button></div>
            </form>`;
        openModal(modalHTML);
    }

    // --- KLANT DETAIL PAGE ---
    function renderKlantDetailPage(klantId) {
        const klant = appData.klanten.find(k => k.klant_id == klantId);
        if (!klant) { mainContent.innerHTML = '<h1>Klant niet gevonden</h1>'; return; }

        const detailsWrapper = document.getElementById('klant-details-wrapper');
        detailsWrapper.innerHTML = `
            <p><strong>Adres:</strong> <span id="detail-adres">${klant.adres || ''}</span></p>
            <p><strong>Postcode:</strong> <span id="detail-postcode">${klant.postcode || ''}</span></p>
            <p><strong>Plaats:</strong> <span id="detail-plaats">${klant.plaats || ''}</span></p>
            <p><strong>Rompslomp ID:</strong> <span id="detail-rompslomp_id">${klant.rompslomp_client_id || ''}</span></p>`;

        document.getElementById('detail-bedrijfsnaam').textContent = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
        if (privacySettings.clients === 'hidden') detailsWrapper.classList.add('opacity-20');
        document.querySelector('[data-action="open-klant-modal"]').dataset.id = klantId;

        const tabsContainer = document.querySelector('.klant-detail-tabs');
        const tabs = ['Abonnementen', 'Contactpersonen', 'Facturen'];
        tabsContainer.innerHTML = tabs.map(tab => `<a href="#" class="klant-detail-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="${tab.toLowerCase()}">${tab}</a>`).join('');
        
        // Add event listener to new tabs
        tabsContainer.addEventListener('click', e => {
            if (e.target.matches('.klant-detail-tab')) {
                e.preventDefault();
                switchKlantDetailTab(klantId, e.target.dataset.tab);
            }
        });
        
        switchKlantDetailTab(klantId, 'abonnementen');
    }

    function switchKlantDetailTab(klantId, tabName) {
        const contentContainer = document.getElementById('klant-detail-tab-content');
        document.querySelectorAll('.klant-detail-tab').forEach(tab => {
            const isSelected = tab.dataset.tab === tabName;
            tab.classList.toggle('border-slate-500', isSelected);
            tab.classList.toggle('text-slate-600', isSelected);
            tab.classList.toggle('border-transparent', !isSelected);
            tab.classList.toggle('text-gray-500', !isSelected);
        });

        if (tabName === 'abonnementen') renderAbonnementenTab(klantId, contentContainer);
        else if (tabName === 'contactpersonen') renderContactenTab(klantId, contentContainer);
        else contentContainer.innerHTML = `<p>Tab '${tabName}' is nog in ontwikkeling.</p>`;
    }

    function renderAbonnementenTab(klantId, container) {
        const abonnementen = appData.abonnementen.filter(a => a.klant_id == klantId);
        let html = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Abonnementen</h3><button data-action="open-abonnement-modal" data-id="${klantId}" class="bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-blue-700">Nieuw</button></div>`;
        if (abonnementen.length === 0) { html += '<p class="text-gray-500">Geen abonnementen gevonden.</p>'; } 
        else {
            html += `<table class="w-full text-left text-sm">
                        <thead><tr class="border-b"><th class="p-2">Product</th><th class="p-2">Aantal</th><th class="p-2">Prijs p/s</th><th class="p-2">Startdatum</th><th class="p-2 text-right">Acties</th></tr></thead><tbody>`;
            abonnementen.forEach(sub => {
                const product = appData.producten.find(p => p.product_id === sub.product_id);
                const prijsText = privacySettings.finance === 'hidden' ? '€ ****' : formatCurrency(sub.actuele_verkoopprijs);
                html += `<tr class="border-b">
                            <td class="p-2">${product?.titel || 'Onbekend product'}</td><td class="p-2">${sub.aantal}</td><td class="p-2">${prijsText}</td>
                            <td class="p-2">${new Date(sub.start_datum).toLocaleDateString('nl-NL')}</td>
                            <td class="p-2 text-right">
                                ${product?.is_variabel ? `<button data-action="open-verbruik-modal" data-id="${sub.klant_dienst_id}" class="text-green-600 hover:text-green-900 p-1" title="Verbruik Invoeren"><i class="fas fa-gas-pump"></i></button>` : ''}
                                <button data-action="open-abonnement-modal" data-id="${sub.klant_id}" data-extra-id="${sub.klant_dienst_id}" class="text-slate-600 hover:text-slate-900 p-1" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                                <button data-action="delete-abonnement" data-id="${sub.klant_dienst_id}" class="text-red-500 hover:text-red-700 p-1" title="Verwijder"><i class="fas fa-trash"></i></button>
                            </td></tr>`;
            });
            html += '</tbody></table>';
        }
        container.innerHTML = html;
    }
    
    function renderContactenTab(klantId, container) {
        const contacten = appData.contactpersonen.filter(c => c.klant_id == klantId);
        let html = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Contactpersonen</h3><button data-action="open-contact-modal" data-id="${klantId}" class="bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-blue-700">Nieuw</button></div>`;
        if (contacten.length === 0) { html += '<p class="text-gray-500">Geen contactpersonen gevonden.</p>'; } 
        else {
            html += `<table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="p-2">Naam</th><th class="p-2">Email</th><th class="p-2">Telefoon</th><th class="p-2 text-right">Acties</th></tr></thead><tbody>`;
            contacten.forEach(contact => {
                html += `<tr class="border-b">
                            <td class="p-2">${contact.naam} ${contact.is_primair_contact ? '<span class="text-xs bg-sky-100 text-sky-800 p-1 rounded">Primair</span>' : ''}</td>
                            <td class="p-2">${contact.email}</td><td class="p-2">${contact.telefoon}</td>
                            <td class="p-2 text-right">
                                <button data-action="open-contact-modal" data-id="${contact.klant_id}" data-extra-id="${contact.contact_id}" class="text-slate-600 hover:text-slate-900 p-1" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                                <button data-action="delete-contact" data-id="${contact.contact_id}" class="text-red-500 hover:text-red-700 p-1" title="Verwijder"><i class="fas fa-trash"></i></button>
                            </td></tr>`;
            });
            html += '</tbody></table>';
        }
        container.innerHTML = html;
    }
    
    async function handleGenerateInvoices() {
        if (!confirm("Weet je zeker dat je facturen wilt genereren voor de huidige periode? Dit kan niet ongedaan worden gemaakt.")) return;
        
        await apiDelay();
        let newInvoices = 0;
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        appData.abonnementen.forEach(sub => {
            // ... more logic here for generating invoices ...
        });

        showToast(`${newInvoices} nieuwe facturen gegenereerd!`, 'success');
        renderFacturatieTabsAndTable();
    }
    
    // --- GLOBAL EVENT LISTENERS ---
    function addGlobalEventListeners() {
        document.body.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            
            e.preventDefault();
            const { action, id, extraId } = actionTarget.dataset;

            const actions = {
                'open-klant-modal': () => openKlantModal(id),
                'close-modal': closeModal,
                'open-product-modal': () => openProductModal(id),
                'open-abonnement-modal': () => openAbonnementModal(id, extraId),
                'open-contact-modal': () => openContactModal(id, extraId),
                'open-invoice-detail-modal': () => openInvoiceDetailModal(id),
                'delete-klant': () => handleDelete('klanten', id, 'klant_id', `Weet je zeker dat je deze klant wilt verwijderen?`),
                'delete-product': () => handleDelete('producten', id, 'product_id', `Weet je zeker dat je dit product wilt verwijderen?`),
                'delete-abonnement': () => handleDelete('abonnementen', id, 'klant_dienst_id', `Weet je zeker dat je dit abonnement wilt verwijderen?`),
                'delete-contact': () => handleDelete('contactpersonen', id, 'contact_id', `Weet je zeker dat je deze contactpersoon wilt verwijderen?`),
                'delete-factuur-regel': () => handleDeleteFactuurRegel(id, extraId),
            };
            if (actions[action]) actions[action]();
        });
        
        document.body.addEventListener('submit', e => {
            if (e.target.tagName !== 'FORM') return;
            e.preventDefault();
            
            const formActions = {
                'settingsForm': () => handleSettingsSubmit(e.target),
                'klantForm': () => handleCrudSubmit('klanten', 'klant_id', e.target),
                'productForm': () => handleCrudSubmit('producten', 'product_id', e.target),
                'abonnementForm': () => handleCrudSubmit('abonnementen', 'klant_dienst_id', e.target),
                'contactForm': () => handleCrudSubmit('contactpersonen', 'contact_id', e.target),
                'verbruikForm': () => handleVerbruikSubmit(e.target),
                'addInvoiceLineForm': () => handleAddInvoiceLine(e.target),
            };
            if (formActions[e.target.id]) formActions[e.target.id]();
        });
    }

    // --- START THE APP ---
    initializeApp();
});
