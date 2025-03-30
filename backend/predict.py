# -*- coding: utf-8 -*-
import sys
import io
import requests
import json
import os
from utils.paths import get_port_file_path, get_log_file_path
import logging

sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Настройка логирования
logging.basicConfig(
    filename=get_log_file_path(),
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    encoding="utf-8",
)

# Получаем путь к изображению из аргументов командной строки
image_path = sys.argv[1]
logging.info(f"Обработка изображения: {image_path}")

# Получаем порт из файла
port_path = get_port_file_path()
logging.info(f"Чтение порта из файла: {port_path}")

try:
    with open(port_path, 'r') as file:
        port = file.read().strip()
    logging.info(f"Получен порт: {port}")
except Exception as e:
    logging.error(f"Ошибка при чтении порта: {str(e)}")
    sys.exit(1)

# Отправляем изображение на сервер
url = f'http://127.0.0.1:{port}/predict'
logging.info(f"Отправка запроса на: {url}")

try:
    with open(image_path, 'rb') as img_file:
        response = requests.post(url, files={'image': img_file})
    logging.info(f"Получен ответ с кодом: {response.status_code}")

    # Обрабатываем ответ
    response_data = response.json()
    if response.status_code == 200:
        print(json.dumps(response_data, ensure_ascii=False))
        logging.info("Успешно получен результат предсказания")
    else:
        error_msg = f"Ошибка: {response.status_code}, {response_data.get('error', 'Неизвестная ошибка')}"
        print(error_msg)
        logging.error(error_msg)
except ValueError as e:
    error_msg = f"Ошибка: {response.status_code}, Невозможно разобрать JSON-ответ: {response.text}"
    print(error_msg)
    logging.error(error_msg)
except Exception as e:
    error_msg = f"Неожиданная ошибка: {str(e)}"
    print(error_msg)
    logging.error(error_msg)
