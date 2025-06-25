import torch
import torchvision.transforms as transforms
from PIL import Image
from io import BytesIO
from .model import build_model

def load_model(model_path):
    """加载训练好的模型和类别映射"""
    checkpoint = torch.load(model_path, map_location=torch.device('cpu'))
    num_classes = len(checkpoint["class_to_idx"])
    model = build_model(num_classes, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    return model, checkpoint["idx_to_class"]

def predict_image(image_bytes, model, idx_to_class):
    """
    从二进制数据预测鱼类
    :param image_bytes: 图片二进制数据
    :return: (鱼类标签1~23, 置信度, 类别名如'fish_1')
    """
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image = Image.open(BytesIO(image_bytes)).convert('RGB')
    image_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)
        _, predicted_idx = torch.max(probs, 1)
        predicted_idx = predicted_idx.item()

        confidence = probs[0][predicted_idx].item()
        fish_name = idx_to_class[predicted_idx]
        fish_label = predicted_idx + 1

    return fish_label, confidence, fish_name