from torchvision import transforms
from .augmentations import RandomSaltPepperNoise


class DataTransforms:
    # Для аугментации всего датасета
    augmentation = transforms.Compose([
        # RandomSaltPepperNoise(probability=0.02),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        # transforms.RandomResizedCrop(size=(256, 256), scale=(0.8, 1.0)),
        transforms.RandomPerspective(distortion_scale=0.2, p=0.5),
        transforms.ToTensor(),
        # transforms.RandomErasing(p=0.3, scale=(0.02, 0.2)),
        transforms.ToPILImage()
    ])
    
    # Для обучения
    train_transforms = transforms.Compose([
        # RandomSaltPepperNoise(probability=0.04),
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],   # стандартные нормировки для ImageNet
                            [0.229, 0.224, 0.225])
    ])

    # Для валидации и тестов
    val_test_transforms = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406],
                            [0.229, 0.224, 0.225])
    ])
        
        