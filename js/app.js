document.addEventListener('DOMContentLoaded', function() {
    
    // --- CONFIGURATION & STATE ---
    const config = { apiUrl: '/api/' };
    let appData = {};
    let productState = { currentPage: 1, type: 'abonnementen', searchTerm: '' };
    const privacySettings = { clients: null, finance: null, margins: null };

    // --- DOM ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const modalContainer = document.getElementById('modal-container');

    // --- UTILS ---
    const formatCurrency = (amount) => `€ ${parseFloat(amount || 0).toFixed(2).replace('.', ',')}`;
    const formatPercentage = (amount) => `${parseFloat(amount || 0).toFixed(2)}%`.replace('.',',');
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    
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
    
    async function apiRequest(endpoint, method = 'GET', body = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) options.body = JSON.stringify(body);
        try {
            const response = await fetch(config.apiUrl + endpoint, options);
            if (!response.ok) {
                let errorMessage = `Serverfout: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) errorMessage = errorData.error;
                } catch (e) { console.error("Non-JSON error response:", await response.text()); }
                throw new Error(errorMessage);
            }
            if (response.status === 204 || method === 'DELETE') return { status: 'success' };
            return await response.json();
        } catch (error) {
            console.error(`API Request Mislukt: ${method} ${endpoint}`, error);
            showToast(error.message, 'error');
            throw error;
        }
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        loadPrivacySettings();
        try {
            appData = await apiRequest('bootstrap.php');
            document.getElementById('error-banner').classList.add('hidden');
        } catch (error) {
            document.getElementById('error-banner').classList.remove('hidden');
            appData = { klanten: [], abonnementen: [], producten: [], leveranciers: [], grootboekrekeningen: [], contactpersonen: [], facturen: [], settings: {}, prijs_historie: [] };
        }
        window.addEventListener('hashchange', navigate);
        addGlobalEventListeners();
        await navigate();
    }

    // --- ROUTER ---
    const routes = {
        '#dashboard': 'pages/dashboard.html',
        '#klanten': 'pages/klanten.html',
        '#klant-detail': 'pages/klant-detail.html',
        '#producten': 'pages/producten.html',
        '#product-detail': 'pages/product-detail.html',
        '#facturatie': 'pages/facturatie.html',
        '#instellingen': 'pages/instellingen.html'
    };

    async function navigate() {
        const path = window.location.hash || '#dashboard';
        const pathParts = path.split('/');
        const page = pathParts[0];
        const id = pathParts[1];
        const routePath = routes[page];
        if (!routePath) { mainContent.innerHTML = `<h1 class="text-red-500">404: Pagina niet gevonden.</h1>`; return; }
        mainContent.innerHTML = `<div class="text-center text-slate-500 p-8"><i class="fas fa-spinner fa-spin fa-2x"></i></div>`;
        try {
            const response = await fetch(routePath);
            if (!response.ok) throw new Error(`Pagina template niet gevonden: ${routePath}`);
            mainContent.innerHTML = await response.text();
            
            const setupFunctions = {
                '#klanten': setupKlantenPage,
                '#klant-detail': () => renderKlantDetailPage(id),
                '#producten': setupProductenPage,
                '#product-detail': () => renderProductDetailPage(id)
            };
            if (setupFunctions[page]) await setupFunctions[page]();
        } catch (error) {
            console.error("Fout tijdens navigeren:", error);
            mainContent.innerHTML = `<h1 class="text-red-500">${error.message}</h1>`;
        }
        document.querySelectorAll('#nav-menu .nav-link').forEach(link => {
            link.classList.toggle('active', new URL(link.href, window.location.origin).hash.startsWith(page));
        });
        updateAllLinks();
    }

    // --- PAGE SETUP & RENDER ---
    async function setupKlantenPage() {
        renderKlantenTable(appData.klanten);
        const searchInput = document.getElementById('klantSearchInput');
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.toLowerCase();
            const filtered = appData.klanten.filter(k => 
                k.bedrijfsnaam.toLowerCase().includes(searchTerm) || (k.plaats && k.plaats.toLowerCase().includes(searchTerm))
            );
            renderKlantenTable(filtered);
        }, 300));
    }
    
    async function setupProductenPage() {
        renderProductTabs();
        await fetchAndRenderProducts();
        const searchInput = document.getElementById('productSearchInput');
        searchInput.addEventListener('input', debounce(async () => {
            productState.searchTerm = searchInput.value;
            productState.currentPage = 1;
            await fetchAndRenderProducts();
        }, 300));
    }
    
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function renderKlantenTable(klanten) {
        const tableBody = document.getElementById('klantenTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!klanten || klanten.length === 0) { tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-gray-500">Geen klanten gevonden.</td></tr>`; return; }
        klanten.forEach(klant => {
            const abonnementenCount = appData.abonnementen.filter(a => a.klant_id == klant.klant_id).length;
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
    
    async function fetchAndRenderProducts() {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="8" class="p-4 text-center"><i class="fas fa-spinner fa-spin"></i> Producten laden...</td></tr>`;
        try {
            const params = new URLSearchParams({
                page: productState.currentPage,
                type: productState.type,
                search: productState.searchTerm
            });
            const endpoint = `v1/producten.php?${params.toString()}`;
            const result = await apiRequest(endpoint);
            renderProductsTable(result.data);
            renderPagination(result.pagination);
        } catch (error) { tableBody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-red-500">Fout bij het laden van producten.</td></tr>`; }
    }

    function renderProductsTable(products) {
        const tableBody = document.getElementById('productsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!products || products.length === 0) { tableBody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-500">Geen producten gevonden.</td></tr>`; return; }
        products.forEach(p => {
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            const margeHidden = privacySettings.finance === 'hidden' || privacySettings.margins === 'hidden';
            row.innerHTML = `
                <td class="p-3 font-medium text-gray-800">${p.titel}</td>
                <td class="p-3">${p.leverancier_naam || 'N/A'}</td>
                <td class="p-3">${p.grootboek_naam || 'N/A'}</td>
                <td class="p-3 text-right">${margeHidden ? '****' : formatCurrency(p.standaard_inkoopprijs)}</td>
                <td class="p-3 text-right">${privacySettings.finance === 'hidden' ? '****' : formatCurrency(p.standaard_verkoopprijs)}</td>
                <td class="p-3 text-right font-medium ${p.marge_percentage < 0 ? 'text-red-500' : 'text-green-600'}">${margeHidden ? '****' : formatPercentage(p.marge_percentage)}</td>
                <td class="p-3 text-center"><span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${p.status !== 'actief' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">${p.status}</span></td>
                <td class="p-3 text-right">
                    <a href="#product-detail/${p.product_id}" class="nav-link text-slate-600 hover:text-slate-900 p-2" title="Details"><i class="fas fa-eye"></i></a>
                    <button data-action="open-product-modal" data-id="${p.product_id}" class="text-slate-600 hover:text-slate-900 p-2" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                    <button data-action="delete-product" data-id="${p.product_id}" class="text-red-500 hover:text-red-800 p-2" title="Verwijder"><i class="fas fa-trash"></i></button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    function renderProductTabs() {
        const tabsContainer = document.getElementById('product-type-tabs');
        if (!tabsContainer) return;
        const tabs = [
            { id: 'abonnementen', label: 'Abonnementen' },
            { id: 'eenmalig', label: 'Eenmalige Producten' }
        ];
        tabsContainer.innerHTML = tabs.map(tab => {
            const isActive = productState.type === tab.id;
            const activeClasses = 'border-slate-500 text-slate-600';
            const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
            return `<a href="#" class="product-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${isActive ? activeClasses : inactiveClasses}" data-type="${tab.id}">${tab.label}</a>`;
        }).join('');
        const newTabsContainer = tabsContainer.cloneNode(true);
        tabsContainer.parentNode.replaceChild(newTabsContainer, tabsContainer);
        newTabsContainer.addEventListener('click', async (e) => {
            if(e.target.matches('.product-tab')) {
                e.preventDefault();
                productState.type = e.target.dataset.type;
                productState.currentPage = 1;
                renderProductTabs();
                await fetchAndRenderProducts();
            }
        });
    }
    
    function renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        if (!container || !pagination || pagination.totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }
        const { currentPage, totalPages, totalItems } = pagination;
        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        container.innerHTML = `
            <span class="text-sm text-gray-700">Pagina <strong>${currentPage}</strong> van <strong>${totalPages}</strong> (${totalItems} items)</span>
            <div>
                <button data-page="${currentPage - 1}" class="pagination-btn" ${prevDisabled}>Vorige</button>
                <button data-page="${currentPage + 1}" class="pagination-btn" ${nextDisabled}>Volgende</button>
            </div>`;
        const newContainer = container.cloneNode(true);
        container.parentNode.replaceChild(newContainer, container);
        newContainer.addEventListener('click', async (e) => {
            if(e.target.matches('.pagination-btn')) {
                productState.currentPage = parseInt(e.target.dataset.page);
                await fetchAndRenderProducts();
            }
        });
    }

    async function renderProductDetailPage(productId) {
        try {
            const product = await apiRequest(`v1/producten.php?id=${productId}`);
            document.getElementById('detail-product-titel').textContent = product.titel;
            document.getElementById('edit-product-btn').dataset.id = productId;
            
            const detailsWrapper = document.getElementById('product-details-wrapper');
            detailsWrapper.innerHTML = `
                <div><p class="text-sm text-gray-500">Leverancier</p><p>${product.leverancier_naam || 'N/A'}</p></div>
                <div><p class="text-sm text-gray-500">Productcode Leverancier (SKU)</p><p>${product.product_code_leverancier || 'N/A'}</p></div>
                <div><p class="text-sm text-gray-500">Categorie</p><p>${product.categorie || 'N/A'}</p></div>
                <div><p class="text-sm text-gray-500">Subcategorie</p><p>${product.subcategorie || 'N/A'}</p></div>
                <div><p class="text-sm text-gray-500">Merk</p><p>${product.merk || 'N/A'}</p></div>
                <div><p class="text-sm text-gray-500">Grootboekrekening</p><p>${product.grootboek_naam || 'N/A'}</p></div>
            `;

            const financeWrapper = document.getElementById('product-finance-wrapper');
            const margeHidden = privacySettings.finance === 'hidden' || privacySettings.margins === 'hidden';
            financeWrapper.innerHTML = `
                <div class="flex justify-between items-center"><span class="text-gray-600">Inkoopprijs:</span> <span class="font-bold">${margeHidden ? '****' : formatCurrency(product.standaard_inkoopprijs)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-600">Verkoopprijs:</span> <span class="font-bold">${privacySettings.finance === 'hidden' ? '****' : formatCurrency(product.standaard_verkoopprijs)}</span></div>
                <div class="flex justify-between items-center border-t pt-2 mt-2"><span class="text-gray-600">Marge:</span> <span class="font-bold ${product.marge_percentage < 0 ? 'text-red-500' : 'text-green-600'}">${margeHidden ? '****' : formatPercentage(product.marge_percentage)}</span></div>
                <hr class="my-4">
                <div><p class="text-sm text-gray-500">Facturatiecyclus</p><p class="capitalize">${product.facturatie_cyclus}</p></div>
                <div><p class="text-sm text-gray-500">Status</p><p class="capitalize">${product.status}</p></div>
            `;
            
            // Add new sections for customers and price history
            const extraInfoContainer = document.createElement('div');
            extraInfoContainer.className = 'lg:col-span-3 mt-6 bg-white p-6 rounded-lg shadow-md';
            mainContent.querySelector('.grid').appendChild(extraInfoContainer);
            renderProductSales(productId, extraInfoContainer);

        } catch (error) { mainContent.innerHTML = `<h1>Fout bij laden product: ${error.message}</h1>`; }
    }
    
    function renderProductSales(productId, container) {
        const actieveDiensten = appData.abonnementen.filter(d => d.product_id == productId);
        let html = `
            <h3 class="text-xl font-bold text-slate-800 mb-4">Actieve abonnementen (${actieveDiensten.length})</h3>
        `;
        if(actieveDiensten.length === 0) {
            html += `<p class="text-gray-500">Dit product is momenteel aan geen enkele klant gekoppeld.</p>`;
        } else {
            html += `<div class="overflow-x-auto"><table class="w-full text-left text-sm">
                <thead><tr class="border-b"><th class="p-2">Klant</th><th class="p-2">Aantal</th><th class="p-2 text-right">Verkoopprijs</th><th class="p-2">Startdatum</th></tr></thead><tbody>`;
            actieveDiensten.forEach(dienst => {
                const klant = appData.klanten.find(k => k.klant_id == dienst.klant_id);
                html += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-2 font-medium"><a href="#klant-detail/${klant.klant_id}" class="nav-link hover:underline">${klant.bedrijfsnaam}</a></td>
                        <td class="p-2">${dienst.aantal}</td>
                        <td class="p-2 text-right">${formatCurrency(dienst.actuele_verkoopprijs)}</td>
                        <td class="p-2">${formatDate(dienst.start_datum)}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }

        const dienstIds = actieveDiensten.map(d => d.klant_dienst_id);
        const prijsHistorie = appData.prijs_historie.filter(h => dienstIds.includes(h.klant_dienst_id));
        
        html += `<h3 class="text-xl font-bold text-slate-800 mt-8 mb-4">Recente Prijswijzigingen</h3>`;
        if(prijsHistorie.length === 0) {
            html += `<p class="text-gray-500">Geen prijswijzigingen gevonden voor de actieve abonnementen van dit product.</p>`;
        } else {
             html += `<div class="overflow-x-auto"><table class="w-full text-left text-sm">
                <thead><tr class="border-b"><th class="p-2">Klant</th><th class="p-2">Datum</th><th class="p-2 text-right">Oude Prijs</th><th class="p-2 text-right">Nieuwe Prijs</th><th class="p-2 text-right">Oud Aantal</th><th class="p-2 text-right">Nieuw Aantal</th></tr></thead><tbody>`;
            prijsHistorie.forEach(item => {
                const dienst = actieveDiensten.find(d => d.klant_dienst_id == item.klant_dienst_id);
                const klant = appData.klanten.find(k => k.klant_id == dienst.klant_id);
                 html += `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="p-2 font-medium">${klant.bedrijfsnaam}</td>
                        <td class="p-2">${formatDate(item.wijzigings_datum)}</td>
                        <td class="p-2 text-right">${formatCurrency(item.oude_verkoopprijs)}</td>
                        <td class="p-2 text-right">${formatCurrency(item.nieuwe_verkoopprijs)}</td>
                        <td class="p-2 text-right">${item.oud_aantal}</td>
                        <td class="p-2 text-right">${item.nieuw_aantal}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        }
        container.innerHTML = html;
    }


    function renderKlantDetailPage(klantId) {
        const klant = appData.klanten.find(k => k.klant_id == klantId);
        if (!klant) { mainContent.innerHTML = '<h1>Klant niet gevonden</h1>'; return; }
        document.getElementById('detail-bedrijfsnaam').textContent = privacySettings.clients === 'hidden' ? `Klant #${klant.klant_id}` : klant.bedrijfsnaam;
        document.querySelector('[data-action="open-klant-modal"]').dataset.id = klantId;
        const detailsWrapper = document.getElementById('klant-details-wrapper');
        const klantType = klant.is_particulier == 1 ? '<span class="text-xs bg-sky-100 text-sky-800 p-1 rounded-full">Particulier</span>' : '<span class="text-xs bg-green-100 text-green-800 p-1 rounded-full">Zakelijk</span>';
        detailsWrapper.innerHTML = `
            <p class="mb-2"><strong>Type:</strong> ${klantType}</p>
            <p><strong>Adres:</strong> ${klant.adres || 'N/A'}</p>
            <p><strong>Postcode:</strong> ${klant.postcode || 'N/A'}</p>
            <p><strong>Plaats:</strong> ${klant.plaats || 'N/A'}</p>
            <hr class="my-3"><p><strong>KvK-nummer:</strong> ${klant.kvk_nummer || 'N/A'}</p>
            <p><strong>BTW-nummer:</strong> ${klant.btw_nummer || 'N/A'}</p>
            <hr class="my-3"><p><strong>Rompslomp ID:</strong> ${klant.rompslomp_client_id || 'N/A'}</p>
            <p><strong>RoutIT Nr:</strong> ${klant.routit_klantnummer || 'N/A'}</p>
            <p><strong>DSD Nr:</strong> ${klant.dsd_klantnummer || 'N/A'}</p>
        `;
        const tabsContainer = document.querySelector('.klant-detail-tabs');
        const tabs = ['Overzicht', 'Abonnementen', 'Contactpersonen', 'Facturen'];
        tabsContainer.innerHTML = tabs.map(tab => `<a href="#" class="klant-detail-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="${tab.toLowerCase()}">${tab}</a>`).join('');
        const newTabsContainer = tabsContainer.cloneNode(true);
        tabsContainer.parentNode.replaceChild(newTabsContainer, tabsContainer);
        newTabsContainer.addEventListener('click', (e) => {
            if (e.target.matches('.klant-detail-tab')) {
                e.preventDefault();
                switchKlantDetailTab(klantId, e.target.dataset.tab);
            }
        });
        switchKlantDetailTab(klantId, 'overzicht');
    }

    function switchKlantDetailTab(klantId, tabName) {
        const contentContainer = document.getElementById('klant-detail-tab-content');
        if (!contentContainer) return;
        contentContainer.innerHTML = `<div class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Tab wordt geladen...</div>`;
        document.querySelectorAll('.klant-detail-tab').forEach(tab => {
            tab.classList.toggle('border-slate-500', tab.dataset.tab === tabName);
            tab.classList.toggle('text-slate-600', tab.dataset.tab === tabName);
            tab.classList.toggle('border-transparent', tab.dataset.tab !== tabName);
            tab.classList.toggle('text-gray-500', tab.dataset.tab !== tabName);
        });
        try {
            if (tabName === 'overzicht') renderOverzichtTab(klantId, contentContainer);
            else if (tabName === 'abonnementen') renderAbonnementenTab(klantId, contentContainer);
            else if (tabName === 'contactpersonen') renderContactenTab(klantId, contentContainer);
            else contentContainer.innerHTML = `<p class="text-gray-500 p-4">Tab '${tabName}' is nog in ontwikkeling.</p>`;
        } catch (error) {
            console.error(`Fout bij renderen van tab ${tabName}:`, error);
            contentContainer.innerHTML = `<p class="text-red-500 p-4">Er is een fout opgetreden bij het laden van deze tab.</p>`;
        }
    }

    function renderOverzichtTab(klantId, container) {
        const klantAbonnementen = appData.abonnementen.filter(a => a.klant_id == klantId);
        let mrr = 0, mcr = 0;
        klantAbonnementen.forEach(sub => {
            const product = appData.producten.find(p => p.product_id == sub.product_id);
            if (product && product.facturatie_cyclus === 'maandelijks') {
                mrr += (parseFloat(sub.actuele_verkoopprijs) || 0) * (sub.aantal || 1);
                mcr += (parseFloat(sub.actuele_inkoopprijs) || 0) * (sub.aantal || 1);
            }
        });
        const marge = mrr > 0 ? ((mrr - mcr) / mrr) * 100 : 0;
        const isHidden = privacySettings.finance === 'hidden' || privacySettings.margins === 'hidden';
        container.innerHTML = `
            <h3 class="text-xl font-bold text-slate-800 mb-4">Financieel Overzicht</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg"><h4 class="text-sm font-semibold text-gray-500">Maandelijkse Omzet (MRR)</h4><p class="text-2xl font-bold text-teal-600">${isHidden ? '****' : formatCurrency(mrr)}</p></div>
                <div class="bg-gray-50 p-4 rounded-lg"><h4 class="text-sm font-semibold text-gray-500">Maandelijkse Kosten (MCR)</h4><p class="text-2xl font-bold text-orange-600">${isHidden ? '****' : formatCurrency(mcr)}</p></div>
                <div class="bg-gray-50 p-4 rounded-lg"><h4 class="text-sm font-semibold text-gray-500">Bruto Marge</h4><p class="text-2xl font-bold ${marge < 0 ? 'text-red-500' : 'text-green-600'}">${isHidden ? '****' : formatPercentage(marge)}</p></div>
            </div>`;
    }

    function renderAbonnementenTab(klantId, container) {
        const abonnementen = appData.abonnementen.filter(a => a.klant_id == klantId);
        let html = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Abonnementen</h3><button data-action="open-abonnement-modal" data-id="${klantId}" class="bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-blue-700">Nieuw</button></div>`;
        if (abonnementen.length === 0) { html += '<p class="text-gray-500">Geen abonnementen gevonden.</p>'; } 
        else {
            html += `<table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="p-2">Product</th><th class="p-2">Aantal</th><th class="p-2 text-right">Verkoopprijs</th><th class="p-2 text-right">Inkoopprijs</th><th class="p-2">Startdatum</th><th class="p-2 text-right">Acties</th></tr></thead><tbody>`;
            abonnementen.forEach(sub => {
                const product = appData.producten.find(p => p.product_id == sub.product_id);
                const verkoopPrijsText = privacySettings.finance === 'hidden' ? '****' : formatCurrency(sub.actuele_verkoopprijs);
                const inkoopPrijsText = privacySettings.margins === 'hidden' ? '****' : formatCurrency(sub.actuele_inkoopprijs);
                const startDate = sub.start_datum ? new Date(sub.start_datum).toLocaleDateString('nl-NL') : 'Onbekend';
                html += `<tr class="border-b hover:bg-gray-50">
                            <td class="p-2">${product?.titel || 'Onbekend product'}</td><td class="p-2">${sub.aantal}</td><td class="p-2 text-right">${verkoopPrijsText}</td>
                            <td class="p-2 text-right">${inkoopPrijsText}</td><td class="p-2">${startDate}</td>
                            <td class="p-2 text-right"><button class="text-slate-600 hover:text-slate-900 p-1" title="Wijzig"><i class="fas fa-pencil-alt"></i></button><button class="text-red-500 hover:text-red-700 p-1" title="Verwijder"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            html += '</tbody></table>';
        }
        container.innerHTML = html;
    }

    function renderContactenTab(klantId, container) {
        let html = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-bold">Contactpersonen</h3><button data-action="open-contact-modal" data-klant-id="${klantId}" class="bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded hover:bg-blue-700">Nieuw</button></div>`;
        const contacten = appData.contactpersonen.filter(c => c.klant_id == klantId);
        if (contacten.length === 0) { html += '<p class="text-gray-500">Geen contactpersonen gevonden.</p>'; } 
        else {
            html += `<div class="space-y-3">`;
            contacten.forEach(contact => {
                html += `
                <div class="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                        <p class="font-semibold">${contact.naam} ${contact.is_primair_contact == 1 ? '<span class="text-xs bg-sky-100 text-sky-800 p-1 rounded-full ml-2">Primair</span>' : ''}</p>
                        <p class="text-sm text-gray-600">${contact.email || ''} | ${contact.telefoon || ''}</p>
                    </div>
                    <div>
                        <button data-action="open-contact-modal" data-id="${contact.contact_id}" class="text-slate-600 hover:text-slate-900 p-1" title="Wijzig"><i class="fas fa-pencil-alt"></i></button>
                        <button data-action="delete-contact" data-id="${contact.contact_id}" class="text-red-500 hover:text-red-700 p-1" title="Verwijder"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        container.innerHTML = html;
    }

    // --- MODALS & CRUD ---
    function openModal(innerHTML, size = 'max-w-2xl') {
        const modalHTML = `<div class="modal" style="display:block;"><div class="modal-content bg-white p-8 rounded-lg shadow-xl w-full ${size} relative">${innerHTML}</div></div>`;
        modalContainer.innerHTML = modalHTML;
    }

    function closeModal() { modalContainer.innerHTML = ''; }
    
    async function handleCrudSubmit(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (form.elements.is_particulier) data.is_particulier = form.elements.is_particulier.checked ? 1 : 0;
        if (form.elements.is_primair_contact) data.is_primair_contact = form.elements.is_primair_contact.checked ? 1 : 0;
        
        const endpoint = form.dataset.endpoint;
        const idField = form.dataset.idField;
        const id = data[idField];
        const typeName = idField.split('_')[0];
        try {
            if (id) {
                await apiRequest(`${endpoint}?id=${id}`, 'PUT', data);
                showToast(`${typeName} succesvol bijgewerkt!`);
            } else {
                await apiRequest(endpoint, 'POST', data);
                showToast(`${typeName} succesvol aangemaakt!`);
            }
            closeModal();
            await initializeApp();
        } catch (error) { /* Fout wordt al getoond door apiRequest */ }
    }
    
    async function handleDelete(type, id) {
        if (confirm(`Weet je zeker dat je deze ${type} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
            try {
                const endpointType = type === 'contactperson' ? 'contactpersonen' : `${type}s`;
                await apiRequest(`v1/${endpointType}.php?id=${id}`, 'DELETE');
                showToast(`${type} succesvol verwijderd.`);
                await initializeApp();
            } catch (error) { /* Fout wordt al getoond door apiRequest */ }
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
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg">Opslaan</button></div>
            </form>`;
        openModal(modalHTML, 'max-w-4xl');
    }
    
    function openContactModal(contactId = null, klantId = null) {
        const contact = contactId ? appData.contactpersonen.find(c => c.contact_id == contactId) : {};
        const isPrimairChecked = contact && contact.is_primair_contact == 1 ? 'checked' : '';
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${contactId ? 'Contact Wijzigen' : 'Nieuw Contact'}</h2>
            <form id="contactForm" data-endpoint="v1/contactpersonen.php" data-id-field="contact_id">
                <input type="hidden" name="contact_id" value="${contact?.contact_id || ''}">
                <input type="hidden" name="klant_id" value="${contact?.klant_id || klantId}">
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Naam</label><input type="text" name="naam" value="${contact?.naam || ''}" class="mt-1 block w-full rounded-md" required></div>
                    <div><label class="block text-sm font-medium">E-mail</label><input type="email" name="email" value="${contact?.email || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Telefoon</label><input type="tel" name="telefoon" value="${contact?.telefoon || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Functie</label><input type="text" name="functie" value="${contact?.functie || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div class="flex items-center"><input type="checkbox" name="is_primair_contact" ${isPrimairChecked} class="h-4 w-4 rounded"><label class="ml-2 text-sm">Primair contact</label></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg">Opslaan</button></div>
            </form>`;
        openModal(modalHTML, 'max-w-lg');
    }
    
    function openProductModal(id = null) {
        const product = id ? appData.producten.find(p => p.product_id == id) : {};
        let leverancierOptions = appData.leveranciers.map(l => `<option value="${l.leverancier_id}" ${product?.leverancier_id == l.leverancier_id ? 'selected' : ''}>${l.naam}</option>`).join('');
        let grootboekOptions = appData.grootboekrekeningen.map(g => `<option value="${g.grootboek_id}" ${product?.grootboekrekening_id == g.grootboek_id ? 'selected' : ''}>${g.naam}</option>`).join('');
        const modalHTML = `
            <button data-action="close-modal" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h2 class="text-2xl font-bold text-slate-800 mb-6">${id ? 'Product Wijzigen' : 'Nieuw Product'}</h2>
            <form id="productForm" data-endpoint="v1/producten.php" data-id-field="product_id">
                <input type="hidden" name="product_id" value="${product?.product_id || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Titel</label><input type="text" name="titel" value="${product?.titel || ''}" class="mt-1 block w-full rounded-md" required></div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium">Leverancier</label>
                        <div class="flex items-center space-x-2">
                           <select name="leverancier_id" id="leverancier-select" class="mt-1 block w-full rounded-md"><option value="">-- Geen --</option>${leverancierOptions}</select>
                           <button type="button" id="add-leverancier-btn" class="p-2 bg-gray-200 hover:bg-gray-300 rounded-md" title="Nieuwe leverancier toevoegen"><i class="fas fa-plus"></i></button>
                        </div>
                        <div id="new-leverancier-form" class="hidden mt-2 p-3 bg-gray-50 rounded-md">
                            <label class="block text-sm font-medium">Nieuwe Leverancier Naam</label>
                            <div class="flex items-center space-x-2">
                                <input type="text" id="new-leverancier-name" class="mt-1 block w-full rounded-md">
                                <button type="button" id="save-new-leverancier-btn" class="bg-green-600 text-white px-3 py-1 rounded-md">Opslaan</button>
                            </div>
                        </div>
                    </div>
                    <div><label class="block text-sm font-medium">Grootboekrekening</label><select name="grootboekrekening_id" class="mt-1 block w-full rounded-md"><option value="">-- Geen --</option>${grootboekOptions}</select></div>
                    <div><label class="block text-sm font-medium">Productcode (SKU)</label><input type="text" name="product_code_leverancier" value="${product?.product_code_leverancier || ''}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Inkoopprijs</label><input type="number" step="0.01" name="standaard_inkoopprijs" value="${product?.standaard_inkoopprijs || 0}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Verkoopprijs</label><input type="number" step="0.01" name="standaard_verkoopprijs" value="${product?.standaard_verkoopprijs || 0}" class="mt-1 block w-full rounded-md"></div>
                    <div><label class="block text-sm font-medium">Facturatiecyclus</label><select name="facturatie_cyclus" class="mt-1 block w-full rounded-md">
                        <option value="maandelijks">Maandelijks</option><option value="kwartaal">Per Kwartaal</option><option value="jaarlijks">Jaarlijks</option><option value="eenmalig">Eenmalig</option>
                    </select></div>
                    <div><label class="block text-sm font-medium">Status</label><select name="status" class="mt-1 block w-full rounded-md"><option value="actief">Actief</option><option value="end_of_sale">End of Sale</option></select></div>
                </div>
                <div class="mt-8 flex justify-end"><button type="button" data-action="close-modal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg mr-2">Annuleren</button><button type="submit" class="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg">Opslaan</button></div>
            </form>`;
        openModal(modalHTML, 'max-w-3xl');
        
        document.getElementById('add-leverancier-btn').addEventListener('click', () => document.getElementById('new-leverancier-form').classList.toggle('hidden'));
        document.getElementById('save-new-leverancier-btn').addEventListener('click', async () => {
            const nameInput = document.getElementById('new-leverancier-name');
            const newName = nameInput.value.trim();
            if (!newName) { showToast('Leveranciersnaam mag niet leeg zijn.', 'error'); return; }
            try {
                const newLeverancier = await apiRequest('v1/leveranciers.php', 'POST', { naam: newName });
                appData.leveranciers.push(newLeverancier);
                const select = document.getElementById('leverancier-select');
                const option = new Option(newLeverancier.naam, newLeverancier.leverancier_id, false, true);
                select.add(option);
                document.getElementById('new-leverancier-form').classList.add('hidden');
                nameInput.value = '';
            } catch(e) { /* error is handled by apiRequest */ }
        });
    }

    // --- GLOBAL EVENT LISTENERS ---
    function addGlobalEventListeners() {
        document.body.addEventListener('click', e => {
            const actionTarget = e.target.closest('[data-action]');
            if (!actionTarget) return;
            const { action, id, klantId } = actionTarget.dataset;
            const actions = {
                'open-klant-modal': () => openKlantModal(id),
                'open-product-modal': () => openProductModal(id),
                'open-contact-modal': () => openContactModal(id, klantId),
                'close-modal': closeModal,
                'delete-klant': () => handleDelete('klant', id),
                'delete-product': () => handleDelete('product', id),
                'delete-contact': () => handleDelete('contactperson', id)
            };
            if (actions[action]) actions[action]();
        });
        document.body.addEventListener('submit', e => {
            if (e.target.tagName !== 'FORM') return;
            e.preventDefault();
            handleCrudSubmit(e.target);
        });
    }

    // --- OTHER UTILITY FUNCTIONS ---
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

    // --- START THE APP ---
    initializeApp();
});
