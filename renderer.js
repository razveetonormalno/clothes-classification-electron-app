// renderer.js
let currentChart = null; // Переменная для хранения текущего графика

function showResults() {
  document.getElementById('resultsTitle').classList.remove('hidden');
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('chartCanvas').classList.remove('hidden');
}

function switchToTwoColumnLayout() {
  document.querySelector('.initial-state').classList.add('hidden');
  document.querySelector('.container').classList.remove('hidden');
}

// Функция для обработки предсказания
async function handlePrediction() {
  try {
    const result = await window.electronAPI.predictImage();
    switchToTwoColumnLayout();
    showResults();
    document.getElementById('result').innerText = `${result.predicted_class}`;
    createChart(result.probabilities);
  } catch (error) {
    console.error('Подробная ошибка:', error);
    alert('Ошибка при предсказании: ' + error.message);
  }
}

// Добавляем обработчики для обеих кнопок
document.getElementById('predictBtn').addEventListener('click', handlePrediction);
document.getElementById('predictBtn2').addEventListener('click', handlePrediction);

// Добавляем обработчик для отображения выбранного изображения
window.electronAPI.onImageSelected((imagePath) => {
  const imagePreview = document.getElementById('imagePreview');
  imagePreview.src = imagePath;
  imagePreview.classList.remove('hidden');
});
  
function createChart(probabilities) {
  const ctx = document.getElementById('chartCanvas').getContext('2d');
  
  // Уничтожаем предыдущий график, если он существует
  if (currentChart) {
    currentChart.destroy();
  }
  
  const labels = Object.keys(probabilities);
  const data = Object.values(probabilities);
  
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Уверенность модели',
        data: data,
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 1
        }
      }
    }
  });
}
  