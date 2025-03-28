import torch
from torchvision.transforms import functional as F

class RandomSaltPepperNoise:
    def __init__(self, probability=0.02):
        self.probability = probability
        
    def __call__(self, img):
        if not isinstance(img, torch.Tensor):
            img = F.to_tensor(img)
            
        rand_mask_salt = torch.rand(img.shape[1], img.shape[2])
        salt_mask = rand_mask_salt < (self.probability / 2)
        
        rand_mask_pepper = torch.rand(img.shape[1], img.shape[2])
        pepper_mask = rand_mask_pepper < (self.probability / 2)
        
        img_noisy = img.clone()
        
        img_noisy[:, salt_mask] = 1
        img_noisy[:, pepper_mask] = 0
        
        return F.to_pil_image(img_noisy)