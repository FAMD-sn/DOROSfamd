const newsContainer = document.getElementById("news-list");

// URL для Google Новостей (RSS → JSON)
const RSS_URL = "https://news.google.com/rss/search?q=новости&hl=ru&gl=RU&ceid=RU:ru";

// Функция загрузки новостей через JSONP
function fetchNews() {
    newsContainer.innerHTML = "<p>Загрузка...</p>";

    const script = document.createElement("script");
    script.src = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}&format=jsonp&callback=displayNews`;
    document.body.appendChild(script);
}

// Функция отображения новостей
function displayNews(data) {
    if (!data.items || data.items.length === 0) {
        newsContainer.innerHTML = "<p>Новостей нет.</p>";
        return;
    }

    let newsHtml = "";
    data.items.forEach(article => {
        newsHtml += `
            <div class="news-item">
                <h3>${article.title}</h3>
                <p>${article.description || "Описание отсутствует."}</p>
                <a href="${article.link}" target="_blank">Читать далее</a>
            </div>
        `;
    });

    newsContainer.innerHTML = newsHtml;
}

// Запускаем загрузку
fetchNews();

// Автообновление каждые 5 минут
setInterval(fetchNews, 300000);