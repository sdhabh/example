import torch
import torch.nn as nn
import torch.optim as optim
from tqdm import tqdm
import os
from dataset import get_data_loaders
from model import build_model
import os.path as osp

# ─── 训练配置（根据硬件调整）───
DATA_DIR = osp.join(osp.dirname(osp.abspath(__file__)), "./data/fish_image")
BATCH_SIZE = 32                                # 批次大小（GPU 建议 32/64，CPU 可减小）
NUM_EPOCHS = 30                                # 训练轮次（可根据验证集调整）
LEARNING_RATE = 0.001                          # 学习率
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")  # 自动选择设备
MODEL_SAVE_PATH = "fish_recognition/models/fish_classifier.pth"  # 模型保存路径


def train():
    # 1. 加载数据
    train_loader, val_loader, class_to_idx = get_data_loaders(DATA_DIR, BATCH_SIZE)
    num_classes = len(class_to_idx)  # 23 类

    # 2. 构建模型
    model = build_model(num_classes).to(DEVICE)
    criterion = nn.CrossEntropyLoss()  # 分类损失（多分类交叉熵）
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    best_val_acc = 0.0  # 记录最佳验证集准确率

    # 3. 训练循环
    for epoch in range(NUM_EPOCHS):
        # ─── 训练阶段 ───
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        with tqdm(train_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS} [Train]") as pbar:
            for images, labels in pbar:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                optimizer.zero_grad()

                outputs = model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                # 统计指标
                train_loss += loss.item() * images.size(0)
                _, predicted = outputs.max(1)
                train_total += labels.size(0)
                train_correct += predicted.eq(labels).sum().item()

                pbar.set_postfix({"Loss": f"{loss.item():.4f}"})

        train_acc = train_correct / train_total
        train_loss /= train_total
        print(f"Train | Loss: {train_loss:.4f}, Acc: {train_acc:.4f}")

        # ─── 验证阶段 ───
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad(), tqdm(val_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS} [Val]") as pbar:
            for images, labels in pbar:
                images, labels = images.to(DEVICE), labels.to(DEVICE)

                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

                pbar.set_postfix({"Loss": f"{loss.item():.4f}"})

        val_acc = val_correct / val_total
        val_loss /= val_total
        print(f"Val   | Loss: {val_loss:.4f}, Acc: {val_acc:.4f}")

        # ─── 保存最佳模型 ───
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            # 保存模型权重 + 类别映射（预测时需要）
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_to_idx": class_to_idx,       # {'fish_1':0, ...}
                "idx_to_class": {v: k for k, v in class_to_idx.items()}  # {0:'fish_1', ...}
            }, MODEL_SAVE_PATH)

    print(f"\n训练完成！最佳验证准确率: {best_val_acc:.4f}")


if __name__ == "__main__":
    # 确保模型保存目录存在
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    train()