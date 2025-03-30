import torch
import torch.nn as nn
from torchvision import models, transforms
from torch.utils.data import Dataset

import os
from PIL import Image

from typing import Literal

class ClothesUtils:
    labels = ['Blouse', 'Cardigan', 'Dress', 'Jacket', 'Pants', 'Romper', 'Shorts', 'Skirt', 'Sweater', 'Tank', 'Tee', 'Top']
    labels_ru = ['Блузка/Рубашка', 'Кардиган', 'Платье', 'Куртка', 'Штаны', 'Комбинезон', 'Шорты', 'Юбка', 'Свитер/Кофта', 'Майка', 'Футболка', 'Топ']
    
    def __init__(self, dataset_root):
        self.dataset_root = dataset_root
        self.platforms, self.device = self.get_device()
        
    def load_resnet(self, path: str, version: Literal['50', '18']):
        # Используем абсолютный путь к модели
        model_path = path if os.path.isabs(path) else os.path.join(self.dataset_root, path)
        
        model_data = torch.load(model_path, map_location=torch.device('cpu'))
        num_ftrs = model_data['fc.weight'].shape[0]
        if version == '18':
            in_shape = model_data['layer4.1.bn2.weight'].shape[0]# для ResNet18
            model = models.resnet18()
        if version == '50':
            in_shape = model_data['layer4.2.bn3.weight'].shape[0] # для ResNet50
            model = models.resnet50()

        # Замена финального fully-connected слоя на новый, соответствующий числу наших классов
        model.fc = nn.Linear(in_shape, num_ftrs)  # Количество классов в нашем датасете

        # Перенос модели на устройство
        model = model.to(self.device)
        model.load_state_dict(model_data)
        
        return model
    
    
    def count_dir_classes(self, dirs):
        classes_dict = {stg: {} for stg in dirs}

        for stage in dirs:
            stage_num = 0

            for cat in os.listdir(os.path.join(self.dataset_root, stage)):
                if cat[0] != '.':
                    cat_dir = os.path.join(self.dataset_root, stage, cat)
                    amount = len(os.listdir(cat_dir))
                    stage_num += amount
                    classes_dict[stage][cat] = amount
                    
                    for f in os.listdir(cat_dir):
                        if not f.endswith('jpg'):
                            print(f"{stage}/{cat}/{f}")
                
            print(f"{stage}: {stage_num}")
        return classes_dict
    
    
    @staticmethod
    def get_device():
        if os.name == 'posix':
            try:
                if torch.mps.is_available():
                    platform = "MacOS"
                    device = torch.device("mps" if torch.mps.is_available() else "cpu")
                else:
                    platform = 'Linux'
                    device = 'cpu'
            except AttributeError:
                if torch.cuda.is_available():
                    platform = "Linux"
                    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                else:
                    platform = 'Linux'
                    device = 'cpu'
        else:
            platform = "Windows"
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        return platform, device
    
    @staticmethod
    def get_image_number(image_name):
        return int(image_name.split('_')[-1].split('.')[0])

    def get_max_image_number(self, directory):
        images_name = [f for f in os.listdir(directory) if f.endswith('.jpg')]
        if not images_name:
            return 0
        max_number = max(self.get_image_number(name) for name in images_name)
        return max_number
    
    
    

class OneCategoryDataset(Dataset):
    def __init__(self, folder_path: str,
                 transform : transforms.Compose = None):
        self.category = os.path.split(folder_path)[1]
        self.image_paths = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith(('.jpg', '.png', '.jpeg'))]
        self.transform = transform
        
        
    def __len__(self):
        return self.image_paths
    
    
    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image