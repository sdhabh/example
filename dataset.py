import torch
from torchvision import datasets, transforms
from torch.utils.data import Subset, DataLoader
from sklearn.model_selection import train_test_split

def get_data_loaders(data_dir, batch_size, val_split=0.2):
    """
    加载数据集并划分训练/验证集，返回 DataLoader 和类别映射
    :param data_dir: 数据集根目录（如 "fish_recognition/data/fish_image"）
    :param batch_size: 批次大小
    :param val_split: 验证集比例
    """
    # 数据增强（训练集随机变换，验证集仅归一化）
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(224),   # 随机裁剪+缩放
        transforms.RandomHorizontalFlip(),   # 随机水平翻转
        transforms.ToTensor(),               # 转张量
        transforms.Normalize(                # 归一化（ImageNet 统计值）
            mean=[0.485, 0.456, 0.406], 
            std=[0.229, 0.224, 0.225]
        )
    ])
    val_transform = transforms.Compose([
        transforms.Resize(256),              # 缩放
        transforms.CenterCrop(224),          # 中心裁剪
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # 加载原始数据集（先不应用 transform，后续划分后再设置）
    full_dataset = datasets.ImageFolder(root=data_dir)
    indices = list(range(len(full_dataset)))  # 所有样本索引
    # 划分训练/验证集索引（固定随机种子保证可复现）
    train_indices, val_indices = train_test_split(
        indices, test_size=val_split, random_state=42, stratify=full_dataset.targets
    )

    # 创建子集并应用对应 transform
    train_dataset = Subset(full_dataset, train_indices)
    train_dataset.dataset.transform = train_transform  # 训练集增强
    val_dataset = Subset(full_dataset, val_indices)
    val_dataset.dataset.transform = val_transform      # 验证集仅归一化

    # 构建 DataLoader
    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, num_workers=4
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, num_workers=4
    )

    return train_loader, val_loader, full_dataset.class_to_idx  # 返回类别映射（如 {'fish_1':0, ...}）