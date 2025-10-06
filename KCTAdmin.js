document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    // In a real app, you would have proper authentication
    
    // Load users
    loadUsers();
    loadOrders();
    
    // Search functionality
    document.getElementById('searchUsers').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTable tr');
        
        rows.forEach(row => {
            const email = row.cells[0].textContent.toLowerCase();
            if (email.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
});

function loadUsers() {
    db.collection('users').get().then(querySnapshot => {
        const usersTable = document.getElementById('usersTable');
        usersTable.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.email}</td>
                <td>${user.role || 'user'}</td>
                <td>
                    <button class="btn btn-sm btn-success make-driver-btn" data-id="${doc.id}">
                        Сделать водителем
                    </button>
                    <button class="btn btn-sm btn-danger remove-driver-btn" data-id="${doc.id}" ${user.role !== 'driver' ? 'disabled' : ''}>
                        Убрать права
                    </button>
                </td>
            `;
            
            usersTable.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.make-driver-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                makeDriver(this.getAttribute('data-id'));
            });
        });
        
        document.querySelectorAll('.remove-driver-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                removeDriver(this.getAttribute('data-id'));
            });
        });
    });
}

function loadOrders() {
    db.collection('orders').orderBy('timestamp', 'desc').get().then(querySnapshot => {
        const ordersTable = document.getElementById('ordersTable');
        ordersTable.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const order = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${doc.id.substring(0, 8)}...</td>
                <td>${order.clientName} (${order.clientPhone})</td>
                <td>${order.fromAddress}</td>
                <td>${order.toAddress}</td>
                <td>${order.status || 'new'}</td>
                <td>${order.driverName || '—'}</td>
            `;
            
            ordersTable.appendChild(row);
        });
    });
}

function makeDriver(userId) {
    db.collection('users').doc(userId).update({
        role: 'driver'
    }).then(() => {
        alert('Пользователь теперь водитель');
        loadUsers();
    }).catch(error => {
        console.error('Error making driver:', error);
        alert('Ошибка: ' + error.message);
    });
}

function removeDriver(userId) {
    db.collection('users').doc(userId).update({
        role: 'user'
    }).then(() => {
        alert('Права водителя убраны');
        loadUsers();
    }).catch(error => {
        console.error('Error removing driver:', error);
        alert('Ошибка: ' + error.message);
    });
}

