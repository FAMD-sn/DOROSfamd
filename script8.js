let db;
let currentUser = null;
const adminUsername = 'Doriush';
const adminPassword = 'doriushsozdatelcompaniifamd20112025etopravda';

document.addEventListener("DOMContentLoaded", () => {
    let request = indexedDB.open("VideoDB", 1);

    request.onupgradeneeded = function(event) {
        let db = event.target.result;
        if (!db.objectStoreNames.contains("videos")) {
            let store = db.createObjectStore("videos", { keyPath: "id", autoIncrement: true });
            store.createIndex("title", "title", { unique: false });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        checkUserStatus();
    };

    request.onerror = function(event) {
        console.error("Ошибка при открытии базы данных", event.target.error);
    };

    // Обработчики для секции регистрации и входа
    document.getElementById("show-register").addEventListener("click", showRegister);
    document.getElementById("show-login").addEventListener("click", showLogin);

    document.getElementById("register-form").addEventListener("submit", registerUser);
    document.getElementById("login-form").addEventListener("submit", loginUser);
    
    document.getElementById("upload-form").addEventListener("submit", uploadVideo);
});

function showRegister() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("register-section").style.display = "block";
}

function showLogin() {
    document.getElementById("register-section").style.display = "none";
    document.getElementById("login-section").style.display = "block";
}

function registerUser(event) {
    event.preventDefault();
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    if (username && password) {
        localStorage.setItem(username, password);
        alert("Регистрация успешна!");
        showLogin();
    }
}

function loginUser(event) {
    event.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (localStorage.getItem(username) === password) {
        currentUser = username;
        alert(`Привет, ${currentUser}!`);
        showVideoSection();
    } else {
        alert("Неверное имя пользователя или пароль");
    }
}

function showVideoSection() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("upload-section").style.display = "block";
    document.getElementById("video-list").style.display = "block";
    loadVideos();
}

function uploadVideo(event) {
    event.preventDefault();

    const videoFileInput = document.getElementById("video-file");
    const videoTitleInput = document.getElementById("video-title");
    const uploadStatus = document.getElementById("upload-status");

    const file = videoFileInput.files[0];
    const title = videoTitleInput.value;

    if (file && title && currentUser) {
        uploadStatus.textContent = "Загрузка...";

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function () {
            const videoData = reader.result;

            let transaction = db.transaction(["videos"], "readwrite");
            let store = transaction.objectStore("videos");

            let video = { 
                title: title, 
                data: videoData, 
                likes: 0,
                username: currentUser
            };

            store.add(video);

            transaction.oncomplete = function () {
                uploadStatus.textContent = "Видео загружено!";
                loadVideos();
                document.getElementById("upload-form").reset();
            };

            transaction.onerror = function () {
                uploadStatus.textContent = "Ошибка при сохранении!";
            };
        };
    }
}

function loadVideos() {
    const trackList = document.getElementById("track-list");
    trackList.innerHTML = "";

    let transaction = db.transaction(["videos"], "readonly");
    let store = transaction.objectStore("videos");

    let request = store.openCursor();
    request.onsuccess = function(event) {
        let cursor = event.target.result;
        if (cursor) {
            displayVideo(cursor.value);
            cursor.continue();
        }
    };
}

function displayVideo(video) {
    const trackList = document.getElementById("track-list");
    const listItem = document.createElement("li");
    listItem.classList.add("track-item");

    const title = document.createElement("span");
    title.textContent = `${video.title} (Автор: ${video.username})`;

    const videoElement = document.createElement("video");
    videoElement.controls = true;

    const blob = new Blob([video.data], { type: "video/mp4" });
    const videoURL = URL.createObjectURL(blob);
    videoElement.src = videoURL;

    const likeButton = document.createElement("button");
    likeButton.textContent = `❤️ ${video.likes}`;
    likeButton.onclick = () => toggleLike(video.id, likeButton);

    listItem.appendChild(title);
    listItem.appendChild(videoElement);
    listItem.appendChild(likeButton);

    // Добавляем кнопку удаления только для пользователя "Doriush"
    if (currentUser === adminUsername) {
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.onclick = () => deleteVideo(video.id);
        listItem.appendChild(deleteButton);
    }

    trackList.appendChild(listItem);
}

function toggleLike(videoId, button) {
    let transaction = db.transaction(["videos"], "readwrite");
    let store = transaction.objectStore("videos");
    let request = store.get(videoId);

    request.onsuccess = function() {
        let video = request.result;
        if (video) {
            video.likes = video.likes > 0 ? 0 : 1;  
            store.put(video);

            button.textContent = `❤️ ${video.likes}`;
        }
    };
}

//mysection

function togglepod(videoId, button) {
    let transaction = db.transaction(["videos"], "readwrite");
    let store = transaction.objectStore("videos");
    let request = store.get(videoId);

    request.onsuccess = function() {
        let video = request.result;
        if (video) {
            video.pod = video.pod > 0 ? 0 : 1;  
            store.put(video);

            button.textContent = `Подписатся ${video.pod}`;
        }
    };
}

//musection
function deleteVideo(videoId) {
    if (confirm("Вы уверены, что хотите удалить это видео? Как админ вы имеете на это право.")) {
        let transaction = db.transaction(["videos"], "readwrite");
        let store = transaction.objectStore("videos");
        let request = store.delete(videoId);

        request.onsuccess = function() {
            alert("Видео удалено!");
            loadVideos();
        };

        request.onerror = function() {
            alert("Ошибка при удалении видео!");
        };
    }
}