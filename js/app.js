document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONFIGURATION ---
    const config = {
        apiUrl: '/api/' // De basis-URL voor de PHP-backend
    };

    // --- MOCK DATABASE (Alleen als fallback bij verbindingsfouten) ---
    const mockDatabase = {
        klanten: [ { klant_id: 1, bedrijfsnaam: 'DEMO DATA: Geen verbinding met database', plaats: 'Onbekend' } ],
        abonnementen: [], producten: [], leveranciers: [], grootboekrekeningen: [], contactpersonen: [],
        facturen: [], factuur_regels: [], variabel_verbruik: [], prijs_historie: [],
        settings: { bedrijfsnaam: 'Mijn MSP (FALLBACK MODE)', btw_percentage: 21 },
    };

    // --- GLOBAL STATE ---
    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');
    let appData = {};
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
    
    // Functie voor API-requests met verbeterde error handling
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

            // Als de server een foutstatus teruggeeft (bv. 404, 500)
            if (!response.ok) {
                let errorMessage = `Serverfout: ${response.status} ${response.statusText}`;
                // Probeer een specifiekere foutmelding uit de JSON-body te halen
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // De error response was geen JSON, log de ruwe tekst
                    console.error("Non-JSON error response from server:", await response.text());
                }
                throw new Error(errorMessage);
            }

            // Als de response '204 No Content' is (bv. bij een succesvolle DELETE)
            if (response.status === 204) {
                return { status: 'success' };
            }
            
            return await response.json();

        } catch (error) {
            console.error(`API Request Mislukt: ${method} ${endpoint}`, error);
            showToast(error.message, 'error');
            throw error; // Gooi de fout door zodat de aanroepende functie erop kan reageren
        }
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        loadPrivacySettings();
        try {
            // Haal alle initiële data op
            appData = await apiRequest('bootstrap.php');
            if (!appData || !appData.klanten) {
                 throw new Error('Ontvangen data is leeg of corrupt. Controleer de PHP-backend.');
            }
            console.log("Successfully initialized with LIVE data from the database.");
            document.getElementById('error-banner').classList.add('hidden');
        } catch (error) {
            // Als de API-request faalt, toon de foutbanner en laad de mock data
            console.error("Kon geen verbinding maken met de API, laad fallback data.", error);
            document.getElementById('error-banner').classList.remove('hidden');
            appData = JSON.parse(JSON.stringify(mockDatabase));
        }
        
        window.addEventListener('hashchange', navigate);
        addGlobalEventListeners();
        await navigate();
    }

    // --- ROUTER & PAGE RENDERING ---
    // (Ingekort voor leesbaarheid, geen wijzigingen in de logica hier)
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
            
            // Wijs de juiste setup-functie toe aan de geladen pagina
            const setupFunctions = {
                '#dashboard': setupDashboardPage,
                '#klanten': setupKlantenPage,
                '#klant-detail': () => renderKlantDetailPage(id),
                '#producten': setupProductenPage,
                '#facturatie': setupFacturatiePage,
                '#instellingen': setupInstellingenPage,
            };
            if (setupFunctions[page]) {
                await setupFunctions[page]();
            }
        } catch (error) {
            mainContent.innerHTML = `<h1 class="text-red-500">${error.message}</h1>`;
        }
        
        // Update actieve navigatielink
        document.querySelectorAll('#nav-menu .nav-link').forEach(link => {
            const linkHash = new URL(link.href, window.location.origin).hash;
            link.classList.toggle('active', linkHash.startsWith(page));
        });
        
        updateAllLinks();
    }

    function setupDashboardPage() { /* ... Geen wijzigingen ... */ }
    function renderDashboardChart() { /* ... Geen wijzigingen ... */ }
    
    async function setupKlantenPage() {
        renderKlantenTable(appData.klanten);
        const searchInput = document.getElementById('klantSearchInput');
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = appData.klanten.filter(k => 
                k.bedrijfsnaam.toLowerCase().includes(searchTerm) || (k.plaats && k.plaats.toLowerCase().includes(searchTerm))
            );
            renderKlantenTable(filtered);
        });
    }

    function renderKlantenTable(klanten) {
        const tableBody = document.getElementById('klantenTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!klanten || klanten.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-gray-500">Geen klanten gevonden.</td></tr>`;
            return;
        }
        klanten.forEach(klant => {
            const abonnementenCount = appData.abonnementen.filter(a => a.klant_id === klant.klant_id).length;
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            const bedrijfsnaam = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
            row.innerHTML = `
                <td class="p-3 font-medium text-gray-800">${bedrijfsnaam}</td>
                <td class="p-3">${privacySettings.clients === 'hidden' ? '****' : (klant.plaats || '')}</td>
                <td class="p-3">${abonnementenCount}</td>
                <td class="p-3 text-right">
                    <a href="#klant-detail/${klant.klant_id}" class="nav-link text-slate-600 hover:text-slate-900 p-2" title="Details"><i class="fas fa-eye"></i></a>
                    <button data-action="open-klant-modal" data-id="${klant.klant_id}" class="text-slate-600 hover:text-slate-900 p-2" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                    <button data-action="delete-klant" data-id="${klant.klant_id}" class="text-red-500 hover:text-red-800 p-2" title="Verwijder"><i class="fas fa-trash"></i></button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    // De overige setup- en render-functies (zoals setupProductenPage) blijven voor nu ongewijzigd
    function setupProductenPage() { /* ... Implementatie volgt ... */ }
    function setupFacturatiePage() { /* ... Implementatie volgt ... */ }
    function setupInstellingenPage() { /* ... Implementatie volgt ... */ }
    
    // --- MODALS & CRUD ---
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
        data.is_particulier = form.elements.is_particulier ? (form.elements.is_particulier.checked ? 1 : 0) : 0;
        const endpoint = form.dataset.endpoint;
        const idField = form.dataset.idField;
        const id = data[idField];
        const typeName = endpoint.split('/')[1].split('.')[0].slice(0, -1);
        try {
            if (id) {
                await apiRequest(`${endpoint}?id=${id}`, 'PUT', data);
                showToast(`${typeName} succesvol bijgewerkt!`);
            } else {
                await apiRequest(endpoint, 'POST', data);
                showToast(`${typeName} succesvol aangemaakt!`);
            }
            closeModal();
            // Herlaad alle data en de huidige pagina.
            await initializeApp();
        } catch (error) {
            // Foutmelding wordt al getoond door apiRequest
        }
    }
    
    async function handleDelete(type, id) {
        if (confirm(`Weet je zeker dat je deze ${type} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
            try {
                await apiRequest(`v1/${type}s.php?id=${id}`, 'DELETE');
                showToast(`${type} succesvol verwijderd.`);
                // Indien op een detailpagina, ga terug naar het overzicht.
                if(window.location.hash.includes('-detail')) {
                    window.location.hash = `#${type}s`;
                } else {
                    await initializeApp();
                }
            } catch (error) {
                // Foutmelding wordt al getoond door apiRequest
            }
        }
    }

    function openKlantModal(id = null) {
        const klant = id ? appData.klanten.find(k => k.klant_id == id) : {};
        const isParticulierChecked = klant && klant.is_particulier == 1 ? 'checked' : '';
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${id ? 'Klant Wijzigen' : 'Nieuwe Klant'}</h2>
            <form id="klantForm" data-endpoint="v1/klanten.php" data-id-field="klant_id">
                <input type="hidden" name="klant_id" value="${klant?.klant_id || ''}">
                <div class="flex items-center mb-4">
                    <input type="checkbox" id="is_particulier" name="is_particulier" class="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500" ${isParticulierChecked}>
                    <label for="is_particulier" class="ml-2 block text-sm text-gray-900">Dit is een particuliere klant</label>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Bedrijfsnaam / Naam</label><input type="text" name="bedrijfsnaam" value="${klant?.bedrijfsnaam || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></div>
                    <div><label class="block text-sm font-medium">Adres</label><input type="text" name="adres" value="${klant?.adres || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Postcode</label><input type="text" name="postcode" value="${klant?.postcode || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div><label class="block text-sm font-medium">Plaats</label><input type="text" name="plaats" value="${klant?.plaats || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    <div></div>
                    <div class="md:col-span-2 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label class="block text-sm font-medium">KvK-nummer</label><input type="text" name="kvk_nummer" value="${klant?.kvk_nummer || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                        <div><label class="block text-sm font-medium">BTW-nummer</label><input type="text" name="btw_nummer" value="${klant?.btw_nummer || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></div>
                    </div>
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

    function renderKlantDetailPage(klantId) {
        // ... (deze code stond in de vorige response en is correct)
    }
    
    // --- GLOBAL EVENT LISTENERS ---
    function addGlobalEventListeners() {
        document.body.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            const { action, id } = actionTarget.dataset;
            const actions = {
                'open-klant-modal': () => openKlantModal(id),
                'close-modal': closeModal,
                'delete-klant': () => handleDelete('klant', id),
            };
            if (actions[action]) actions[action]();
        });
        
        document.body.addEventListener('submit', e => {
            if (e.target.tagName !== 'FORM') return;
            e.preventDefault();
            const formActions = {
                'klantForm': () => handleCrudSubmit(e.target),
                'productForm': () => handleCrudSubmit(e.target),
            };
            if (formActions[e.target.id]) formActions[e.target.id]();
        });
    }

    // --- UTILITY FUNCTIONS ---
    function loadPrivacySettings() { /* ... Geen wijzigingen ... */ }
    function getPrivacyQueryString() { /* ... Geen wijzigingen ... */ }
    function updateAllLinks() { /* ... Geen wijzigingen ... */ }
    function switchKlantDetailTab(klantId, tabName) { /* ... Geen wijzigingen ... */ }
    function renderAbonnementenTab(klantId, container) { /* ... Geen wijzigingen ... */ }

    // --- START THE APP ---
    initializeApp();
});
