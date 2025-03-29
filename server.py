from flask import Flask, request, jsonify
import torch
from PIL import Image
from py_app import ClothesUtils, DataTransforms
from waitress import serve
import socket
import os

app = Flask(__name__)

# Загрузка модели при старте сервера
clth_utils = ClothesUtils('')

model_name = 'resnet50_Fine-Tuning_best_1.pth'
print(">>> server.py сейчас в: ", os.getcwd())
resources_path = os.path.join(os.path.split(os.getcwd())[0], "Resources")
# model_path = os.path.join(resources_path, model_name)  # На MacOS
model_path = os.path.join("/".join(os.getcwd().split('/')[:6]), 'models', model_name)  # На MacOS
# print(">>> server.py находится в:", os.getcwd())
# print(">>> Ищем модельку в:", model_path)
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
        # Возвращаем JSON-ответ с ошибкой
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = find_free_port()
    
    with open('port.txt', 'w') as file:
        file.write(str(port))
    
    serve(app, host='0.0.0.0', port=port)
    # app.run(host='0.0.0.0', port=8081, debug=False)