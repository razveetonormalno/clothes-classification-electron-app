import sys
import requests
import json
import os

# Получаем путь к изображению из аргументов командной строки
image_path = sys.argv[1]

# resources_path = os.path.join(os.path.split(os.getcwd())[0], "Resources")

# port_path = os.path.join(resources_path, 'port.txt')
port_path = 'port.txt'
with open(port_path, 'r') as file:
    port = file.read().strip()

# Отправляем изображение на сервер
url = f'http://127.0.0.1:{port}/predict'
with open(image_path, 'rb') as img_file:
    response = requests.post(url, files={'image': img_file})

# Обрабатываем ответ
try:
    response_data = response.json()  # Попытка разобрать JSON
    if response.status_code == 200:
        print(json.dumps(response_data, ensure_ascii=False))
        
        # predict_name = 'predict.json'
        # predict_path = os.path.join(resources_path, predict_name)  # На MacOS
        # with open(predict_path, 'w', encoding='utf-8') as file:
        #     json.dump(response_data, file, ensure_ascii=False)
    else:
        print(f"Ошибка: {response.status_code}, {response_data.get('error', 'Неизвестная ошибка')}")
except ValueError:
    print(f"Ошибка: {response.status_code}, Невозможно разобрать JSON-ответ: {response.text}")
    
    
    
    
# # predict.py
# import sys, json
# import torch
# from torchvision import transforms
# from PIL import Image

# from py_app import ClothesUtils, DataTransforms


# # Загрузка модели (замените 'model.pt' на ваш файл модели)
# clth_utils = ClothesUtils('/Users/maksimpishulin/MyApplications/Clothes Classification/py-app/deep-fashion/torch_train')
# model = clth_utils.load_resnet('models/resnet50_Fine-Tuning_best_1.pth', '50')
# model.eval()

# # Получаем путь к изображению из аргументов командной строки
# image_path = sys.argv[1]

# # Определите необходимые преобразования (измените, если нужно)
# transform = DataTransforms().val_test_transforms

# img = Image.open(image_path).convert('RGB')
# input_tensor = transform(img).unsqueeze(0)
# input_tensor = input_tensor.to(clth_utils.device)

# # Выполнение предсказания
# with torch.no_grad():
#     output = model(input_tensor)
#     probabilities = torch.softmax(output, dim=1).squeeze().tolist()

# # Задайте имена классов, соответствующие вашей модели
# classes = clth_utils.labels_ru

# predicted_index = probabilities.index(max(probabilities))
# predicted_class = classes[predicted_index]

# # Формируем JSON-результат
# result = {
#     'predicted_class': predicted_class,
#     'probabilities': dict(zip(classes, probabilities))
# }

# print(json.dumps(result))
