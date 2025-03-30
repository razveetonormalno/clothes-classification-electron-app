# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
import torch
from PIL import Image
from classifier import ClothesUtils, DataTransforms
from waitress import serve
import socket
import os
from utils.paths import get_models_path, get_port_file_path, get_log_file_path
import logging
import sys
import io
import signal


sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


print("Python executable:", sys.executable)
print("Current directory:", os.getcwd())
print("__file__:", __file__)

# Настройка логирования
logging.basicConfig(
    filename=get_log_file_path(),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding="utf-8",
)

# Логируем информацию о запуске
logging.info("=" * 50)
logging.info("Запуск сервера")
logging.info(f"Текущая директория: {os.getcwd()}")
logging.info(f"Переменные окружения: NODE_ENV={os.environ.get('NODE_ENV')}, RESOURCE_PATH={os.environ.get('RESOURCE_PATH')}")
logging.info("=" * 50)

app = Flask(__name__)

# Загрузка модели при старте сервера
models_path = get_models_path()
logging.info(f"Путь к директории моделей: {models_path}")

clth_utils = ClothesUtils(models_path)

model_name = 'resnet50_Fine-Tuning_best_1.pth'
logging.info(f"Запуск сервера в директории: {os.getcwd()}")

# Используем относительный путь к модели
model_path = model_name
logging.info(f"Путь к модели: {model_path}")

model = clth_utils.load_resnet(model_path, '50')
model.eval()

# Преобразования
transform = DataTransforms().val_test_transforms
classes = clth_utils.labels_ru

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))  # 0 - выбрать случайный свободный порт
        return s.getsockname()[1]
    

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok"})


@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Получаем изображение из запроса
        file = request.files['image']
        img = Image.open(file).convert('RGB')

        # Преобразуем изображение
        input_tensor = transform(img).unsqueeze(0)
        input_tensor = input_tensor.to(clth_utils.device)

        # Выполняем предсказание
        with torch.no_grad():
            output = model(input_tensor)
            probabilities = torch.softmax(output, dim=1).squeeze().tolist()

        # Определяем класс
        predicted_index = probabilities.index(max(probabilities))
        predicted_class = classes[predicted_index]
        
        proba_list = list(map(lambda x: round(x, 4), probabilities))

        # Формируем JSON-ответ
        result = {
            'predicted_class': predicted_class,
            'probabilities': dict(zip(classes, proba_list))
        }
        return jsonify(result)

    except Exception as e:
        logging.error(f"Ошибка при предсказании: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/kill', methods=['DELETE'])
def kill():
    logging.info("Сервер завершает работу")
    os.kill(os.getpid(), signal.SIGINT)

if __name__ == '__main__':
    logging.info("Сервер запускается...")
    port = find_free_port()
    
    port_file_path = get_port_file_path()
    logging.info(f"Запись порта в файл: {port_file_path}")
    
    with open(port_file_path, 'w') as file:
        file.write(str(port))
    
    logging.info(f"Сервер запущен на порту: {port}")
    serve(app, host='0.0.0.0', port=port)

