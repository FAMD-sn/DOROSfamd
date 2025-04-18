// Получаем элементы с помощью ID
const playButton = document.getElementById('play');
const evenButton = document.getElementById('even');
const oddButton = document.getElementById('odd');
const playAgainButton = document.getElementById('play-again');
const resultMessage = document.getElementById('result-message');
const userChoiceText = document.getElementById('user-choice');
const computerChoiceText = document.getElementById('computer-choice');
const numberResultText = document.getElementById('number-result');
const choicesDiv = document.querySelector('.choices');

// Функция для генерации случайного числа от 0 до 20
function getRandomNumber() {
    return Math.floor(Math.random() * 21);
}

// Функция для обработки результата
function playGame(userChoice) {
    const computerNumber = getRandomNumber();
    const isEven = computerNumber % 2 === 0;

    const computerChoice = isEven ? 'Чёт' : 'Нечёт';
    const result = (userChoice === computerChoice) ? 'Вы выиграли!' : 'Вы проиграли!';

    // Отображаем результат
    userChoiceText.textContent = `Ваш выбор: ${userChoice}`;
    computerChoiceText.textContent = `Выбор компьютера: ${computerChoice}`;
    numberResultText.textContent = `Осталось шариков: ${computerNumber}`;
    resultMessage.textContent = result;

    // Показываем кнопку "Играть снова"
    playAgainButton.style.display = 'block';
}

// Обработчик для кнопки "Играть"
playButton.addEventListener('click', () => {
    // Скрываем кнопку "Играть" и показываем кнопки выбора
    playButton.style.display = 'none';
    choicesDiv.style.display = 'block';
});

// Обработчик событий для кнопки "Чёт"
evenButton.addEventListener('click', () => {
    playGame('Чёт');
});

// Обработчик событий для кнопки "Нечёт"
oddButton.addEventListener('click', () => {
    playGame('Нечёт');
});

// Обработчик для кнопки "Играть снова"
playAgainButton.addEventListener('click', () => {
    // Очищаем отображаемые данные и скрываем кнопку "Играть снова"
    resultMessage.textContent = '';
    userChoiceText.textContent = 'Ваш выбор: ';
    computerChoiceText.textContent = 'Выбор компьютера: ';
    numberResultText.textContent = 'Осталось шариков: ';
    playAgainButton.style.display = 'none';

    // Показываем кнопку "Играть" снова
    playButton.style.display = 'block';
    choicesDiv.style.display = 'none';
});