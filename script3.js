let map;
let infoWindow;

function initMap() {
    // Создаем карту с начальной позицией
    const initialLocation = { lat: 55.7558, lng: 37.6173 }; // Москва
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: initialLocation,
    });

    infoWindow = new google.maps.InfoWindow();

    // Добавляем обработчик для кликов по карте
    google.maps.event.addListener(map, "click", function (event) {
        const clickedLocation = event.latLng;
        getPlaceInfo(clickedLocation);
    });
}

function getPlaceInfo(latLng) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, function (results, status) {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById("place-info").textContent =
                    "Адрес: " + results[0].formatted_address;
            } else {
                document.getElementById("place-info").textContent = "Адрес не найден.";
            }
        } else {
            document.getElementById("place-info").textContent =
                "Ошибка при получении информации.";
        }
    });
}

