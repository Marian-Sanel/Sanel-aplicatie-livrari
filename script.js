// Configurare Firebase
const firebaseConfig = {
    databaseURL: "https://curse-sanel-default-rtdb.europe-west1.firebasedatabase.app"
};

// Inițializare Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Clasa pentru gestionarea comenzilor
class OrderManager {
    constructor() {
        this.orders = new Map();
        this.timers = new Map(); // Pentru a ține evidența timer-elor
        this.setupFirebaseListeners();
        this.setupEventListeners();
        this.startAutoUpdate();
    }

    // Setează ascultătorii Firebase pentru sincronizare în timp real
    setupFirebaseListeners() {
        // Ascultă pentru modificări în comenzile active
        database.ref('orders').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            this.orders.clear();
            Object.entries(data).forEach(([id, order]) => {
                this.orders.set(id, order);
            });
            this.updateDisplay();
        });

        // Ascultă pentru modificări în istoric
        database.ref('history').on('value', (snapshot) => {
            const data = snapshot.val() || [];
            localStorage.setItem('istoric_livrari', JSON.stringify(data));
        });
    }

    // Salvează comenzile în Firebase
    saveOrders() {
        const ordersObject = {};
        this.orders.forEach((order, id) => {
            ordersObject[id] = order;
        });
        database.ref('orders').set(ordersObject);
    }

    // Generează un ID unic pentru comandă
    generateOrderId() {
        return Date.now().toString(36).toUpperCase();
    }

    // Adaugă o comandă nouă
    addOrder(eventName, address, deliveryTime) {
        const order = {
            id: this.generateOrderId(),
            eventName,
            address,
            deliveryTime: new Date(deliveryTime).getTime(),
            status: 'pending',
            createdAt: Date.now()
        };
        this.orders.set(order.id, order);
        this.saveOrders();
        this.updateDisplay();
    }

    // Confirmă livrarea unei comenzi
    confirmDelivery(orderId, hasReturn, returnTime = null) {
        const order = this.orders.get(orderId);
        if (!order) return;

        if (hasReturn) {
            order.status = 'return_scheduled';
            order.returnTime = new Date(returnTime).getTime();
        } else {
            order.status = 'delivered';
            order.deliveredAt = Date.now();
            this.saveToHistory(order, 'delivered');
        }

        this.saveOrders();
        this.updateDisplay();
    }

    // Verifică și elimină comenzile livrate după 4 ore
    checkAndRemoveDeliveredOrders() {
        const now = Date.now();
        for (const [id, order] of this.orders) {
            if (order.status === 'delivered' && now - order.deliveredAt > 4 * 60 * 60 * 1000) {
                this.orders.delete(id);
            }
        }
        this.saveOrders();
        this.updateDisplay();
    }

    // Actualizează afișarea comenzilor
    updateDisplay() {
        const grid = document.getElementById('orders-grid');
        grid.innerHTML = '';

        for (const order of this.orders.values()) {
            const card = this.createOrderCard(order);
            grid.appendChild(card);
        }
    }

    // Editează o comandă
    editOrder(orderId, eventName, address, deliveryTime) {
        const order = this.orders.get(orderId);
        if (!order) return;

        order.eventName = eventName;
        order.address = address;
        order.deliveryTime = new Date(deliveryTime).getTime();
        
        this.saveOrders();
        this.updateDisplay();
    }

    // Creează un card pentru comandă
    createOrderCard(order) {
        const card = document.createElement('div');
        card.className = `order-card status-${this.getStatusClass(order)}`;
        
        const deliveryTime = new Date(order.deliveryTime);
        const timeRemaining = this.getTimeRemaining(deliveryTime);

        // Determină textul și clasa pentru badge-ul de status și iconița
        let statusText, statusClass, statusIcon;
        if (order.status === 'return_scheduled') {
            statusText = 'Ridicare';
            statusClass = 'return';
            statusIcon = '<i class="fa-solid fa-arrow-up-from-bracket"></i>';
        } else if (order.status === 'delivered') {
            statusText = 'Finalizată';
            statusClass = 'completed';
            statusIcon = '<i class="fa-solid fa-check"></i>';
        } else {
            statusText = 'Livrare';
            statusClass = 'pending';
            statusIcon = '<i class="fa-solid fa-truck"></i>';
        }

        card.innerHTML = `
            <div class="status-badge ${statusClass}">${statusIcon} ${statusText}</div>
            <button class="cancel-btn" data-order-id="${order.id}"><i class="fa-solid fa-trash"></i></button>
            <div class="order-info">
                <div class="order-event">${order.eventName}</div>
                <div class="order-address">${order.address}</div>
                <div class="delivery-info ${(order.status === 'return_scheduled' || order.status === 'delivered') ? 'strikethrough' : ''}">
                    <div class="order-time">Livrare: ${deliveryTime.toLocaleString()}</div>
                    <div class="timer" data-order-id="${order.id}">Timp rămas: ${timeRemaining || 'Expirat'}</div>
                </div>
                ${order.status === 'return_scheduled' || (order.status === 'delivered' && order.returnCompleted) ? 
                    `<div class="return-info ${order.returnCompleted ? 'strikethrough' : ''}">
                        <div class="order-time">Ridicare: ${new Date(order.returnTime).toLocaleString()}</div>
                        <div class="timer" data-return-id="${order.id}">Timp până la ridicare: ${this.getTimeRemaining(new Date(order.returnTime)) || 'Expirat'}</div>
                    </div>` : ''}
            </div>
            <div class="card-actions">
                <button class="edit-btn" data-order-id="${order.id}"><i class="fa-solid fa-pen-to-square"></i> Editează</button>
                ${order.status === 'pending' ? 
                    `<button class="confirm-btn" data-order-id="${order.id}"><i class="fa-solid fa-truck-arrow-right"></i> Confirmare livrare</button>` : 
                 (order.status === 'return_scheduled' || (order.status === 'delivered' && order.returnCompleted)) ?
                    `<button class="complete-btn ${order.returnCompleted ? 'completed' : ''}" data-order-id="${order.id}"><i class="fa-solid fa-check-double"></i> Finalizare ridicare</button>` : ''}
            </div>
        `;

        // Adaugă event listener pentru butonul de anulare
        card.querySelector('.cancel-btn').addEventListener('click', () => {
            this.cancelOrder(order.id);
        });

        // Adaugă event listener pentru butonul de editare
        card.querySelector('.edit-btn').addEventListener('click', () => {
            this.showEditModal(order.id);
        });

        if (order.status === 'pending') {
            card.querySelector('.confirm-btn').addEventListener('click', () => {
                this.showDeliveryConfirmation(order.id);
            });
        } else if (order.status === 'return_scheduled') {
            card.querySelector('.complete-btn').addEventListener('click', () => {
                this.completeOrder(order.id);
            });
        }

        // Pornește timer-ele pentru acest card
        this.startTimer(order.id, deliveryTime);
        if (order.status === 'return_scheduled') {
            this.startTimer(order.id, new Date(order.returnTime), true);
        }

        return card;
    }

    // Calculează timpul rămas până la livrare
    getTimeRemaining(deliveryTime) {
        const now = new Date();
        const diff = deliveryTime - now;
        
        if (diff <= 0) return null;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }

    // Determină clasa CSS pentru status
    getStatusClass(order) {
        if (order.status === 'return_scheduled') return 'blue';
        if (order.status === 'delivered') return 'purple';
        
        const now = new Date();
        const deliveryTime = new Date(order.deliveryTime);
        const diffHours = (deliveryTime - now) / (1000 * 60 * 60);
        
        if (diffHours > 24) return 'green';
        if (diffHours > 1) return 'yellow';
        return 'red';
    }

    // Configurează event listeners
    setupEventListeners() {
        // Adăugare comandă
        const addOrderBtn = document.getElementById('add-order-btn');
        const addOrderModal = document.getElementById('add-order-modal');
        const addOrderForm = document.getElementById('add-order-form');
        const closeBtn = addOrderModal.querySelector('.close-btn');

        addOrderBtn.addEventListener('click', () => {
            addOrderModal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            addOrderModal.style.display = 'none';
        });

        addOrderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const eventName = document.getElementById('event-name').value;
            const address = document.getElementById('delivery-address').value;
            const deliveryTime = document.getElementById('delivery-time').value;
            this.addOrder(eventName, address, deliveryTime);
            addOrderModal.style.display = 'none';
            addOrderForm.reset();
        });

        // Confirmare livrare
        const deliveryModal = document.getElementById('delivery-modal');
        const returnModal = document.getElementById('return-modal');
        const returnForm = document.getElementById('return-form');

        document.getElementById('confirm-with-return').addEventListener('click', () => {
            deliveryModal.style.display = 'none';
            returnModal.style.display = 'block';
        });

        document.getElementById('confirm-without-return').addEventListener('click', () => {
            const orderId = deliveryModal.dataset.orderId;
            this.confirmDelivery(orderId, false);
            deliveryModal.style.display = 'none';
        });

        returnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const orderId = returnModal.dataset.orderId;
            const returnTime = document.getElementById('return-time').value;
            this.confirmDelivery(orderId, true, returnTime);
            returnModal.style.display = 'none';
            returnForm.reset();
        });

        // Editare comandă
        const editOrderModal = document.getElementById('edit-order-modal');
        const editOrderForm = document.getElementById('edit-order-form');
        const editCloseBtn = editOrderModal.querySelector('.close-btn');

        editCloseBtn.addEventListener('click', () => {
            editOrderModal.style.display = 'none';
        });

        editOrderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const orderId = document.getElementById('edit-order-id').value;
            const eventName = document.getElementById('edit-event-name').value;
            const address = document.getElementById('edit-delivery-address').value;
            const deliveryTime = document.getElementById('edit-delivery-time').value;
            
            this.editOrder(orderId, eventName, address, deliveryTime);
            editOrderModal.style.display = 'none';
        });

        // Închidere modale la click în afara lor
        window.addEventListener('click', (e) => {
            if (e.target === addOrderModal) addOrderModal.style.display = 'none';
            if (e.target === deliveryModal) deliveryModal.style.display = 'none';
            if (e.target === returnModal) returnModal.style.display = 'none';
            if (e.target === editOrderModal) editOrderModal.style.display = 'none';
        });

        // Adaugă event listener pentru butonul de istoric
        const openHistoryBtn = document.getElementById('open-history-btn');
        if (openHistoryBtn) {
            openHistoryBtn.addEventListener('click', () => {
                // Deschide modalul și afișează istoricul
                const modal = document.getElementById('history-modal');
                const tableContainer = document.getElementById('history-table-container');
                let history = [];
                if (typeof window !== 'undefined' && window.require) {
                    // Electron: citește din fișier
                    try {
                        const fs = window.require('fs');
                        const path = window.require('path');
                        const filePath = path.join(__dirname, 'istoric_livrari.json');
                        if (fs.existsSync(filePath)) {
                            const raw = fs.readFileSync(filePath, 'utf-8');
                            history = JSON.parse(raw || '[]');
                        }
                    } catch (e) {
                        tableContainer.innerHTML = '<div style="color:red">Eroare la citirea istoricului!</div>';
                    }
                } else {
                    // Browser: citește din localStorage
                    history = JSON.parse(localStorage.getItem('istoric_livrari') || '[]');
                }
                if (history.length === 0) {
                    tableContainer.innerHTML = '<div>Nu există livrări finalizate în istoric.</div>';
                } else {
                    let html = '<table class="history-table"><thead><tr>' +
                        '<th>ID</th><th>Eveniment</th><th>Adresă</th><th>Încărcată</th><th>Livrată</th><th>Retur?</th><th>Programare retur</th><th>Ridicare finalizată</th>' +
                        '</tr></thead><tbody>';
                    for (const entry of history) {
                        html += `<tr>
                            <td>${entry.id}</td>
                            <td>${entry.eventName}</td>
                            <td>${entry.address}</td>
                            <td>${entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</td>
                            <td>${entry.deliveredAt ? new Date(entry.deliveredAt).toLocaleString() : ''}</td>
                            <td>${entry.returnScheduled ? 'DA' : 'NU'}</td>
                            <td>${entry.returnTime ? new Date(entry.returnTime).toLocaleString() : ''}</td>
                            <td>${entry.returnCompletedAt ? new Date(entry.returnCompletedAt).toLocaleString() : ''}</td>
                        </tr>`;
                    }
                    html += '</tbody></table>';
                    tableContainer.innerHTML = html;
                }
                modal.style.display = 'block';
            });
        }
        // Închide modalul de istoric
        const closeHistoryBtn = document.getElementById('close-history-modal');
        if (closeHistoryBtn) {
            closeHistoryBtn.addEventListener('click', () => {
                document.getElementById('history-modal').style.display = 'none';
            });
        }
    }

    // Afișează modalul de confirmare livrare
    showDeliveryConfirmation(orderId) {
        const deliveryModal = document.getElementById('delivery-modal');
        const returnModal = document.getElementById('return-modal');
        const order = this.orders.get(orderId);
        
        deliveryModal.dataset.orderId = orderId;
        returnModal.dataset.orderId = orderId;
        document.getElementById('return-address').value = order.address;
        
        deliveryModal.style.display = 'block';
    }

    // Pornește actualizarea automată
    startAutoUpdate() {
        setInterval(() => {
            this.checkAndRemoveDeliveredOrders();
            this.updateDisplay();
        }, 60000); // Actualizare la fiecare minut
    }

    // Pornește timer-ul pentru o comandă
    startTimer(orderId, targetTime, isReturn = false) {
        const timerKey = isReturn ? `return-${orderId}` : orderId;
        
        // Oprește timer-ul existent dacă există
        if (this.timers.has(timerKey)) {
            clearInterval(this.timers.get(timerKey));
        }

        const timerElement = document.querySelector(`.timer[data-${isReturn ? 'return-' : ''}order-id="${orderId}"]`);
        if (!timerElement) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = targetTime - now;
            
            if (diff <= 0) {
                timerElement.textContent = 'Expirat';
                clearInterval(this.timers.get(timerKey));
                this.timers.delete(timerKey);
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            timerElement.textContent = `${isReturn ? 'Timp până la ridicare: ' : 'Timp rămas: '}${hours}h ${minutes}m ${seconds}s`;
        };

        // Actualizează imediat și apoi la fiecare secundă
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        this.timers.set(timerKey, timer);
    }

    // Afișează modalul de editare
    showEditModal(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return;

        const editModal = document.getElementById('edit-order-modal');
        const editForm = document.getElementById('edit-order-form');

        document.getElementById('edit-order-id').value = orderId;
        document.getElementById('edit-event-name').value = order.eventName;
        document.getElementById('edit-delivery-address').value = order.address;
        document.getElementById('edit-delivery-time').value = new Date(order.deliveryTime).toISOString().slice(0, 16);

        editModal.style.display = 'block';
    }

    // Anulează o comandă
    cancelOrder(orderId) {
        // Oprește timer-ul înainte de a șterge comanda
        if (this.timers.has(orderId)) {
            clearInterval(this.timers.get(orderId));
            this.timers.delete(orderId);
        }
        this.orders.delete(orderId);
        this.saveOrders();
        this.updateDisplay();
    }

    // Finalizează o comandă cu ridicare
    completeOrder(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return;

        order.status = 'delivered';
        order.returnCompleted = true;
        this.saveToHistory(order, 'returnCompleted');
        this.saveOrders();
        this.updateDisplay();
    }

    // Salvează o cursă finalizată în istoricul localStorage și, dacă e desktop, și în fișierul fizic
    saveToHistory(order, action) {
        const entry = {
            id: order.id,
            eventName: order.eventName,
            address: order.address,
            createdAt: order.createdAt,
            deliveryTime: order.deliveryTime,
            deliveredAt: order.deliveredAt || (action === 'delivered' ? Date.now() : null),
            returnScheduled: !!order.returnTime,
            returnTime: order.returnTime || null,
            returnCompletedAt: order.returnCompleted && order.status === 'delivered' ? Date.now() : null
        };

        // Salvează în Firebase
        database.ref('history').once('value', (snapshot) => {
            const history = snapshot.val() || [];
            history.push(entry);
            database.ref('history').set(history);
        });
    }

    // Funcție pentru exportul istoricului ca fișier JSON
    exportHistory() {
        const history = localStorage.getItem('istoric_livrari') || '[]';
        const blob = new Blob([history], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'istoric_livrari.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Inițializare aplicație
document.addEventListener('DOMContentLoaded', () => {
    new OrderManager();
}); 