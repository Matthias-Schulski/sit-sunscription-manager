document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONFIGURATION ---
    const config = {
        apiUrl: '/api/' // De basis-URL voor de PHP-backend
    };

    // --- MOCK DATABASE (Alleen als fallback bij verbindingsfouten) ---
    const mockDatabase = {
        klanten: [ { klant_id: 1, bedrijfsnaam: 'DEMO: Schoonmaakbedrijf', plaats: 'Amsterdam' } ],
        abonnementen: [], producten: [], leveranciers: [], grootboekrekeningen: [], contactpersonen: [],
        facturen: [], factuur_regels: [], variabel_verbruik: [], prijs_historie: [],
        settings: { bedrijfsnaam: 'Mijn MSP (FALLBACK MODE)', btw_percentage: 21 },
    };

    // --- GLOBAL STATE ---
    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    let appData = {}; // Deze wordt nu gevuld door de API
    const privacySettings = { clients: null, finance: null, margins: null };

    // --- UTILS ---
    const formatCurrency = (amount) => `€ ${parseFloat(amount).toFixed(2).replace('.', ',')}`;
    
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
    
    // Functie voor API-requests
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(config.apiUrl + endpoint, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP Error ${response.status}`);
            }
            // Voor DELETE-requests is er vaak geen body
            if (method === 'DELETE') return { status: 'success' };
            
            return await response.json();
        } catch (error) {
            console.error(`API Request Failed: ${method} ${endpoint}`, error);
            showToast(`Fout: ${error.message}`, 'error');
            throw error;
        }
    }


    // --- INITIALIZATION ---
    async function initializeApp() {
        loadPrivacySettings();
        try {
            // We halen alle initiële data op via bootstrap.php
            appData = await apiRequest('bootstrap.php');

            if (!appData || !appData.klanten) {
                 throw new Error('Ontvangen data is leeg of corrupt.');
            }
            console.log("Successfully initialized with LIVE data from the database.");
            document.getElementById('error-banner').classList.add('hidden');

        } catch (error) {
            console.error("Could not connect to API or fetch data, using mock data as a fallback.", error);
            document.getElementById('error-banner').classList.remove('hidden');
            appData = JSON.parse(JSON.stringify(mockDatabase)); // Fallback naar mock data
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
            
            if (setupFunctions[page]) await setupFunctions[page]();
            
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

        const facturenWacht = appData.facturen.filter(f => f.status === 'wacht_op_data').length;
        const facturenKlaar = appData.facturen.filter(f => f.status === 'klaar_voor_facturatie').length;
        document.getElementById('dashboard-facturen-wacht').textContent = facturenWacht;
        document.getElementById('dashboard-facturen-klaar').textContent = facturenKlaar;
    }

    function renderDashboardChart() {
        const ctx = document.getElementById('revenueChart')?.getContext('2d');
        if (!ctx) return;
        new Chart(ctx, { type: 'line', data: {
            labels: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun'], // Mock data for now
            datasets: [{ label: 'Omzet', data: [1250, 1900, 3100, 2800, 3900, 4250], borderColor: '#14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.1)', fill: true, tension: 0.4 }]
        }});
    }

    async function setupKlantenPage() {
        // Data wordt nu uit de globale appData gehaald, die bij start gevuld is.
        const searchInput = document.getElementById('klantSearchInput');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = appData.klanten.filter(k => 
                k.bedrijfsnaam.toLowerCase().includes(searchTerm) || (k.plaats && k.plaats.toLowerCase().includes(searchTerm))
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
            row.className = 'border-b hover:bg-gray-50';
            
            const bedrijfsnaam = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
            row.innerHTML = `
                <td class="p-3 font-medium text-gray-800">${bedrijfsnaam}</td>
                <td class="p-3">${privacySettings.clients === 'hidden' ? '****' : klant.plaats}</td>
                <td class="p-3">${abonnementenCount}</td>
                <td class="p-3 text-right">
                    <a href="#klant-detail/${klant.klant_id}" class="nav-link text-slate-600 hover:text-slate-900 p-2" title="Details"><i class="fas fa-eye"></i></a>
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
            row.className = 'border-b hover:bg-gray-50';
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
        // Deze functie moet nog verder uitgewerkt worden
        document.getElementById('generateInvoicesBtn').addEventListener('click', () => showToast('Facturatie generatie is nog niet geïmplementeerd.', 'error'));
    }

    function setupInstellingenPage() {
        const form = document.getElementById('settingsForm');
        form.elements['setting-bedrijfsnaam'].value = appData.settings.bedrijfsnaam;
        form.elements['setting-btw'].value = appData.settings.btw_percentage;
        // renderMasterDataTable('leveranciers'); // Toekomstige functie
    }

    // --- MODALS and CRUD Logic ---
    function openModal(innerHTML, size = 'max-w-2xl') {
        const modalHTML = `
            <div class="modal" style="display:block;">
                <div class="modal-content bg-white p-8 rounded-lg shadow-xl w-full ${size} relative">
                    ${innerHTML}
                </div>
            </div>`;
        modalContainer.innerHTML = modalHTML;
    }

    function closeModal() {
        modalContainer.innerHTML = '';
    }

    async function handleCrudSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const endpoint = form.dataset.endpoint;
        const id = data[form.dataset.idField];

        try {
            if (id) {
                // Update (PUT)
                await apiRequest(`${endpoint}?id=${id}`, 'PUT', data);
                showToast(`${endpoint.slice(0, -1)} succesvol bijgewerkt!`);
            } else {
                // Create (POST)
                await apiRequest(endpoint, 'POST', data);
                showToast(`${endpoint.slice(0, -1)} succesvol aangemaakt!`);
            }
            closeModal();
            // Herlaad alle data om de UI te synchroniseren.
            // Dit is een simpele maar effectieve methode.
            await initializeApp(); 

        } catch(error) {
            // Foutmelding wordt al getoond door apiRequest
        }
    }
    
    async function handleDelete(type, id) {
        if (confirm(`Weet je zeker dat je deze ${type} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
            try {
                await apiRequest(`v1/${type}s.php?id=${id}`, 'DELETE');
                showToast(`${type} succesvol verwijderd.`);
                await initializeApp(); // Herlaad data en UI
            } catch(error) {
                 // Foutmelding wordt al getoond door apiRequest
            }
        }
    }

    function openKlantModal(id = null) {
        const klant = id ? appData.klanten.find(k => k.klant_id == id) : {};
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${id ? 'Klant Wijzigen' : 'Nieuwe Klant'}</h2>
            <form id="klantForm" data-endpoint="v1/klanten.php" data-id-field="klant_id">
                <input type="hidden" name="klant_id" value="${klant?.klant_id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Bedrijfsnaam</label><input type="text" name="bedrijfsnaam" value="${klant?.bedrijfsnaam || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                    <div><label class="block text-sm font-medium">Adres</label><input type="text" name="adres" value="${klant?.adres || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Postcode</label><input type="text" name="postcode" value="${klant?.postcode || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Plaats</label><input type="text" name="plaats" value="${klant?.plaats || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div></div>
                    <div class="md:col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label class="block text-sm font-medium">Rompslomp ID</label><input type="text" name="rompslomp_client_id" value="${klant?.rompslomp_client_id || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                        <div><label class="block text-sm font-medium">RoutIT Klantnr.</label><input type="text" name="routit_klantnummer" value="${klant?.routit_klantnummer || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                        <div><label class="block text-sm font-medium">DSD Klantnr.</label><input type="text" name="dsd_klantnummer" value="${klant?.dsd_klantnummer || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    </div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2 hover:bg-gray-300">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Opslaan</button></div>
            </form>`;
        openModal(modalHTML, 'max-w-4xl');
    }
    
    // De overige modal-functies (openProductModal, etc.) blijven voor nu grotendeels hetzelfde.
    // Ze moeten later worden aangepast om met hun eigen API-endpoints te werken.

    // --- KLANT DETAIL PAGE ---
    function renderKlantDetailPage(klantId) {
        const klant = appData.klanten.find(k => k.klant_id == klantId);
        if (!klant) { mainContent.innerHTML = '<h1>Klant niet gevonden</h1>'; return; }

        document.getElementById('detail-bedrijfsnaam').textContent = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
        
        const detailsWrapper = document.getElementById('klant-details-wrapper');
        detailsWrapper.innerHTML = `
            <p><strong>Adres:</strong> ${klant.adres || 'N/A'}</p>
            <p><strong>Postcode:</strong> ${klant.postcode || 'N/A'}</p>
            <p><strong>Plaats:</strong> ${klant.plaats || 'N/A'}</p>
            <hr class="my-3">
            <p><strong>Rompslomp ID:</strong> ${klant.rompslomp_client_id || 'N/A'}</p>
            <p><strong>RoutIT Nr:</strong> ${klant.routit_klantnummer || 'N/A'}</p>
            <p><strong>DSD Nr:</strong> ${klant.dsd_klantnummer || 'N/A'}</p>
        `;

        if (privacySettings.clients === 'hidden') detailsWrapper.classList.add('opacity-20');
        document.querySelector('[data-action="open-klant-modal"]').dataset.id = klantId;

        const tabsContainer = document.querySelector('.klant-detail-tabs');
        const tabs = ['Abonnementen', 'Contactpersonen', 'Facturen'];
        tabsContainer.innerHTML = tabs.map(tab => `<a href="#" class="klant-detail-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="${tab.toLowerCase()}">${tab}</a>`).join('');
        
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
        else contentContainer.innerHTML = `<p class="text-gray-500">Tabblad '${tabName}' is nog niet geïmplementeerd.</p>`;
    }

    function renderAbonnementenTab(klantId, container) {
        const abonnementen = appData.abonnementen.filter(a => a.klant_id == klantId);
        let html = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Abonnementen</h3><button data-action="open-abonnement-modal" data-id="${klantId}" class="bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-blue-700">Nieuw</button></div>`;
        if (abonnementen.length === 0) { html += '<p class="text-gray-500">Geen abonnementen gevonden.</p>'; } 
        else {
            html += `<table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="p-2">Product</th><th class="p-2">Aantal</th><th class="p-2">Prijs p/s</th><th class="p-2">Startdatum</th><th class="p-2 text-right">Acties</th></tr></thead><tbody>`;
            abonnementen.forEach(sub => {
                const product = appData.producten.find(p => p.product_id === sub.product_id);
                const prijsText = privacySettings.finance === 'hidden' ? '€ ****' : formatCurrency(sub.actuele_verkoopprijs);
                html += `<tr class="border-b hover:bg-gray-50">
                            <td class="p-2">${product?.titel || 'Onbekend product'}</td><td class="p-2">${sub.aantal}</td><td class="p-2">${prijsText}</td>
                            <td class="p-2">${new Date(sub.start_datum).toLocaleDateString('nl-NL')}</td>
                            <td class="p-2 text-right">
                                <button class="text-slate-600 hover:text-slate-900 p-1" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                                <button class="text-red-500 hover:text-red-700 p-1" title="Verwijder"><i class="fas fa-trash"></i></button>
                            </td></tr>`;
            });
            html += '</tbody></table>';
        }
        container.innerHTML = html;
    }

    // --- GLOBAL EVENT LISTENERS ---
    function addGlobalEventListeners() {
        document.body.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            
            // e.preventDefault(); // Niet altijd wenselijk
            const { action, id } = actionTarget.dataset;

            const actions = {
                'open-klant-modal': () => openKlantModal(id),
                'close-modal': closeModal,
                'delete-klant': () => handleDelete('klant', id),
                // Voeg hier meer acties toe naarmate je meer CRUD-functionaliteit bouwt
                'delete-product': () => showToast('Product verwijderen nog niet geïmplementeerd.', 'error'),
            };
            if (actions[action]) actions[action]();
        });
        
        document.body.addEventListener('submit', e => {
            if (e.target.tagName !== 'FORM') return;
            e.preventDefault();
            
            const formActions = {
                'klantForm': () => handleCrudSubmit(e.target),
                'productForm': () => showToast('Product opslaan nog niet geïmplementeerd.', 'error'),
            };

            if (formActions[e.target.id]) formActions[e.target.id]();
        });
    }

    // --- START THE APP ---
    initializeApp();
});
