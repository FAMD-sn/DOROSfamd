document.addEventListener('DOMContentLoaded', function() {
    // Check if driver is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            checkDriverRole(user.uid);
        } else {
            // No user is signed in
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('driverPanel').style.display = 'none';
        }
    });
    
    // Login form
    document.getElementById('driverLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                checkDriverRole(userCredential.user.uid);
            })
            .catch(error => {
                console.error('Login error:', error);
                alert('Ошибка входа: ' + error.message);
            });
    });
    
    // Listen for new orders
    db.collection('orders')
        .where('status', '==', 'new')
        .onSnapshot(snapshot => {
            const ordersList = document.getElementById('ordersList');
            ordersList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const order = doc.data();
                const orderItem = document.createElement('div');
                orderItem.className = 'list-group-item';
                orderItem.innerHTML = `
                    <h5>Заказ #${doc.id.substring(0, 8)}...</h5>
                    <p>Откуда: ${order.fromAddress}</p>
                    <p>Куда: ${order.toAddress}</p>
                    <p>Расстояние: ${order.distance} км</p>
                    <p>Стоимость: ${order.price} сомони</p>
                    <p>Тариф: ${getTariffName(order.tariff)}</p>
                    <button class="btn btn-sm btn-primary accept-order-btn" data-id="${doc.id}">Принять заказ</button>
                `;
                
                ordersList.appendChild(orderItem);
            });
            
            // Add event listeners to accept buttons
            document.querySelectorAll('.accept-order-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    acceptOrder(this.getAttribute('data-id'));
                });
            });
        });
    
    // Complete order button
    document.getElementById('completeOrderBtn').addEventListener('click', function() {
        const orderId = this.getAttribute('data-id');
        completeOrder(orderId);
    });
});

function checkDriverRole(userId) {
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists && doc.data().role === 'driver') {
                // User is a driver
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('driverPanel').style.display = 'block';
                
                // Load driver info
                loadDriverInfo(userId);
                
                // Check if driver has an active order
                checkActiveOrder(userId);
            } else {
                // User is not a driver
                auth.signOut();
                alert('У вас нет прав водителя. Обратитесь к администратору.');
            }
        })
        .catch(error => {
            console.error('Error checking role:', error);
            alert('Ошибка проверки прав: ' + error.message);
        });
}

function loadDriverInfo(userId) {
    db.collection('drivers').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const driver = doc.data();
                document.getElementById('driverInfo').textContent = 
                    `${driver.name} | ${driver.carModel}, ${driver.carColor}, ${driver.carNumber} | ${driver.phone}`;
            }
        })
        .catch(error => {
            console.error('Error loading driver info:', error);
        });
}

function checkActiveOrder(userId) {
    db.collection('orders')
        .where('driverId', '==', userId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                showCurrentOrder(doc.id, doc.data());
            }
        });
}

function acceptOrder(orderId) {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get driver info
    db.collection('drivers').doc(user.uid).get()
        .then(driverDoc => {
            if (!driverDoc.exists) {
                throw new Error('Driver info not found');
            }
            
            const driver = driverDoc.data();
            
            // Update order
            db.collection('orders').doc(orderId).update({
                status: 'accepted',
                driverId: user.uid,
                driverName: driver.name,
                driverPhone: driver.phone,
                carModel: driver.carModel,
                carColor: driver.carColor,
                carNumber: driver.carNumber,
                acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Show current order
                db.collection('orders').doc(orderId).get()
                    .then(doc => {
                        showCurrentOrder(orderId, doc.data());
                    });
            })
            .catch(error => {
                console.error('Error accepting order:', error);
                alert('Ошибка при принятии заказа: ' + error.message);
            });
        })
        .catch(error => {
            console.error('Error getting driver info:', error);
            alert('Ошибка при получении информации о водителе: ' + error.message);
        });
}

function showCurrentOrder(orderId, order) {
    const currentOrder = document.getElementById('currentOrder');
    const currentOrderDetails = document.getElementById('currentOrderDetails');
    
    currentOrderDetails.innerHTML = `
        <p><strong>Клиент:</strong> ${order.clientName} (${order.clientPhone})</p>
        <p><strong>Откуда:</strong> ${order.fromAddress}</p>
        <p><strong>Куда:</strong> ${order.toAddress}</p>
        <p><strong>Расстояние:</strong> ${order.distance} км</p>
        <p><strong>Стоимость:</strong> ${order.price} сомони</p>
        <p><strong>Тариф:</strong> ${getTariffName(order.tariff)}</p>
        <p><strong>Оплата:</strong> ${getPaymentName(order.payment)}</p>
        ${order.comment ? `<p><strong>Комментарий:</strong> ${order.comment}</p>` : ''}
    `;
    
    document.getElementById('completeOrderBtn').setAttribute('data-id', orderId);
    currentOrder.style.display = 'block';
}

function completeOrder(orderId) {
    db.collection('orders').doc(orderId).update({
        status: 'completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        document.getElementById('currentOrder').style.display = 'none';
        alert('Заказ успешно завершен');
    })
    .catch(error => {
        console.error('Error completing order:', error);
        alert('Ошибка при завершении заказа: ' + error.message);
    });
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

