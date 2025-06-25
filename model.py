import torch
import torch.nn as nn
from torchvision.models import resnet18

def build_model(num_classes, pretrained=True):
    """
    构建 ResNet18 模型，替换最后一层全连接层
    :param num_classes: 类别数（你的场景是 23 类）
    :param pretrained: 是否加载 ImageNet 预训练权重（迁移学习核心）
    """
    model = resnet18(pretrained=pretrained)
    # 替换最后一层全连接层
    in_features = model.fc.in_features  # ResNet18 最后一层输入维度
    model.fc = nn.Linear(in_features, num_classes)  # 输出 23 类
    return model