document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    const map = L.map('map').setView([40.2833, 69.6333], 13); // Khujand coordinates
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    let routingControl = null;
    let fromMarker = null;
    let toMarker = null;
    let fromPoint = null;
    let toPoint = null;
    
    // Login form
    document.getElementById('clientLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const phone = document.getElementById('phone').value;
        const name = document.getElementById('name').value;
        const password = document.getElementById('password').value;
        
        // Simple validation
        if (phone && name && password) {
            localStorage.setItem('clientPhone', phone);
            localStorage.setItem('clientName', name);
            
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('orderForm').style.display = 'block';
            document.getElementById('orderHistory').style.display = 'block';
            
            loadOrderHistory();
        } else {
            alert('Пожалуйста, заполните все поля');
        }
    });
    
    // Map click handler
    map.on('click', function(e) {
        if (!fromPoint) {
            // First click - set "from" point
            fromPoint = e.latlng;
            if (fromMarker) map.removeLayer(fromMarker);
            fromMarker = L.marker(fromPoint).addTo(map)
                .bindPopup('Откуда')
                .openPopup();
            
            // Reverse geocode to get address
            getAddress(fromPoint).then(address => {
                document.getElementById('fromAddress').textContent = address;
                document.getElementById('fromCoords').value = `${fromPoint.lat},${fromPoint.lng}`;
            });
        } else if (!toPoint) {
            // Second click - set "to" point
            toPoint = e.latlng;
            if (toMarker) map.removeLayer(toMarker);
            toMarker = L.marker(toPoint).addTo(map)
                .bindPopup('Куда')
                .openPopup();
            
            // Reverse geocode to get address
            getAddress(toPoint).then(address => {
                document.getElementById('toAddress').textContent = address;
                document.getElementById('toCoords').value = `${toPoint.lat},${toPoint.lng}`;
                
                // Calculate route
                calculateRoute(fromPoint, toPoint);
            });
        } else {
            // Reset points
            map.removeLayer(fromMarker);
            map.removeLayer(toMarker);
            if (routingControl) map.removeControl(routingControl);
            
            fromPoint = e.latlng;
            fromMarker = L.marker(fromPoint).addTo(map)
                .bindPopup('Откуда')
                .openPopup();
            
            toPoint = null;
            document.getElementById('toAddress').textContent = '';
            document.getElementById('toCoords').value = '';
            document.getElementById('distance').textContent = '0';
            document.getElementById('price').textContent = '0';
            
            getAddress(fromPoint).then(address => {
                document.getElementById('fromAddress').textContent = address;
                document.getElementById('fromCoords').value = `${fromPoint.lat},${fromPoint.lng}`;
            });
        }
    });
    
    // Time selection
    document.querySelector('input[name="time"][value="later"]').addEventListener('change', function() {
        document.getElementById('specificTime').disabled = !this.checked;
    });
    
    // Form submission
    document.getElementById('taxiOrderForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!fromPoint || !toPoint) {
            alert('Пожалуйста, укажите точки отправления и назначения на карте');
            return;
        }
        
        const order = {
            clientPhone: localStorage.getItem('clientPhone'),
            clientName: localStorage.getItem('clientName'),
            fromAddress: document.getElementById('fromAddress').textContent,
            toAddress: document.getElementById('toAddress').textContent,
            fromCoords: document.getElementById('fromCoords').value,
            toCoords: document.getElementById('toCoords').value,
            distance: parseFloat(document.getElementById('distance').textContent),
            price: parseFloat(document.getElementById('price').textContent),
            tariff: document.getElementById('tariff').value,
            airConditioner: document.getElementById('airConditioner').checked,
            meetWithSign: document.getElementById('meetWithSign').checked,
            tips: parseInt(document.getElementById('tips').value),
            payment: document.querySelector('input[name="payment"]:checked').value,
            time: document.querySelector('input[name="time"]:checked').value === 'now' ? 'now' : 
                 document.getElementById('specificTime').value,
            withChildren: document.getElementById('withChildren').checked,
            comment: document.getElementById('comment').value,
            status: 'new',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Save to Firestore
        db.collection('orders').add(order)
            .then(docRef => {
                // Send to Telegram
                sendToTelegram(order, docRef.id);
                
                // Save to local history
                saveToHistory(order, docRef.id);
                
                alert('Заказ успешно создан! Ожидайте водителя');
                resetForm();
            })
            .catch(error => {
                console.error('Error adding order:', error);
                alert('Ошибка при создании заказа: ' + error.message);
            });
    });
    
    // Listen for order updates
    db.collection('orders')
        .where('clientPhone', '==', localStorage.getItem('clientPhone'))
        .where('status', '==', 'accepted')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const order = change.doc.data();
                    showDriverNotification(order);
                }
            });
        });
});

function getAddress(latlng) {
    // In a real app, you would use a proper geocoding service
    return Promise.resolve(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
}

function calculateRoute(from, to) {
    if (routingControl) {
        map.removeControl(routingControl);
    }
    
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(from.lat, from.lng),
            L.latLng(to.lat, to.lng)
        ],
        routeWhileDragging: true,
        show: false // Don't show instructions
    }).addTo(map);
    
    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const distance = routes[0].summary.totalDistance / 1000; // in km
        document.getElementById('distance').textContent = distance.toFixed(2);
        
        // Calculate price
        let price = 0;
        if (distance <= 4) {
            price = 10;
        } else {
            price = 2.5 * distance;
        }
        
        // Add extras
        if (document.getElementById('airConditioner').checked) price += 1;
        if (document.getElementById('meetWithSign').checked) price += 4;
        
        document.getElementById('price').textContent = price.toFixed(2);
    });
}

function sendToTelegram(order, orderId) {
    const botToken = '8233984213:AAE7gKUQRMeacw2X95lRSLrhUYPM-WnjVzg';
    const chatId = '7456349349';
    
    let message = `Новый заказ #${orderId}\n`;
    message += `Клиент: ${order.clientName} (${order.clientPhone})\n`;
    message += `Откуда: ${order.fromAddress}\n`;
    message += `Куда: ${order.toAddress}\n`;
    message += `Расстояние: ${order.distance} км\n`;
    message += `Стоимость: ${order.price} сомони\n`;
    message += `Тариф: ${getTariffName(order.tariff)}\n`;
    message += `Оплата: ${getPaymentName(order.payment)}\n`;
    message += `Время: ${order.time === 'now' ? 'Сейчас' : order.time}\n`;
    if (order.comment) message += `Комментарий: ${order.comment}\n`;
    
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: message
        })
    }).catch(error => console.error('Error sending to Telegram:', error));
}

function getTariffName(tariff) {
    const names = {
        economy: 'Эконом',
        comfort: 'Комфорт',
        business: 'Бизнес',
        minivan: 'На 6 человек',
        delivery: 'Доставка'
    };
    return names[tariff] || tariff;
}

function getPaymentName(payment) {
    const names = {
        cash: 'Наличные',
        khujandBank: 'KhujandCityBank',
        card: 'Карта'
    };
    return names[payment] || payment;
}

function saveToHistory(order, orderId) {
    let history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    history.unshift({
        id: orderId,
        ...order
    });
    localStorage.setItem('orderHistory', JSON.stringify(history));
    loadOrderHistory();
}

function loadOrderHistory() {
    const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <h6>Заказ #${item.id.substring(0, 8)}...</h6>
            <p>${item.fromAddress} → ${item.toAddress}</p>
            <p>${item.price} сомони, ${new Date(item.timestamp?.toDate() || Date.now()).toLocaleString()}</p>
            <p>Статус: ${item.status || 'new'}</p>
        `;
        historyList.appendChild(li);
    });
}

function showDriverNotification(order) {
    const notification = document.createElement('div');
    notification.className = 'toast show';
    notification.innerHTML = `
        <strong>Ваш заказ принят</strong>
        <p>Водитель: ${order.driverName}</p>
        <p>Автомобиль: ${order.carModel}, ${order.carColor}, ${order.carNumber}</p>
        <p>Телефон: ${order.driverPhone}</p>
    `;
    
    document.getElementById('driverNotification').appendChild(notification);
    
    // Remove after 10 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 10000);
}

function resetForm() {
    // Reset form fields
    document.getElementById('taxiOrderForm').reset();
    
    // Reset map
    if (fromMarker) map.removeLayer(fromMarker);
    if (toMarker) map.removeLayer(toMarker);
    if (routingControl) map.removeControl(routingControl);
    
    fromPoint = null;
    toPoint = null;
    
    document.getElementById('fromAddress').textContent = '';
    document.getElementById('toAddress').textContent = '';
    document.getElementById('fromCoords').value = '';
    document.getElementById('toCoords').value = '';
    document.getElementById('distance').textContent = '0';
    document.getElementById('price').textContent = '0';
    document.getElementById('specificTime').disabled = true;
}

