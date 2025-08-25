# 🚀 Star-Based Deployment Guide

## 概要

このプロジェクトは **GitHub Star** をトリガーとしたオンデマンドデプロイメントシステムを使用しています。

## 📋 事前準備

### 1. AWSアカウント設定

#### ECRリポジトリ作成
```bash
aws ecr create-repository --repository-name sns-app --region ap-northeast-1
```

#### IAMユーザー作成（Terraform用）
必要な権限：
- `AmazonEC2FullAccess`
- `AmazonECSFullAccess`
- `AmazonRDSFullAccess` 
- `ElastiCacheFullAccess`
- `AmazonRoute53FullAccess`
- `AWSCertificateManagerFullAccess`
- `IAMFullAccess`
- `AmazonSSMFullAccess`

### 2. GitHub Secrets設定

Repository Settings → Secrets and variables → Actions で以下を設定：

```bash
# AWS認証
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# ドメイン設定
DOMAIN_NAME=yourdomain.com

# ECR Repository
ECR_REPOSITORY_URL=123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/sns-app

# Laravel設定
APP_KEY=base64:your-generated-app-key
DB_PASSWORD=your-secure-password

# Firebase認証情報（Base64エンコード）
FIREBASE_CREDENTIALS=ewogIC...

# フロントエンド設定
CORS_ALLOWED_ORIGINS=https://yourapp.vercel.app,https://yourdomain.com
FRONTEND_URL=https://yourapp.vercel.app
```

### 3. ドメイン準備

1. ドメインを取得（お名前.com、Route53など）
2. Route53にHosted Zoneを作成
3. ドメインのネームサーバーをRoute53に設定

## 🌟 使用方法

### アプリケーション起動
1. このリポジトリページの **⭐ Star** ボタンをクリック
2. GitHub Actionsが自動実行される
3. 5-10分でデプロイ完了
4. Issuesに起動通知が投稿される

### アプリケーション停止  
1. **⭐ Starred** をクリックしてStarを外す
2. 10分以内にECSサービスが停止される
3. Issuesに停止通知が投稿される

## 📊 インフラ構成

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Vercel        │    │     ALB      │    │   ECS Fargate   │
│  (Nuxt.js)      │───▶│   (HTTPS)    │───▶│   (Laravel)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                        ┌──────────────┐    ┌─────────────────┐
                        │     RDS      │    │  ElastiCache    │
                        │   (MySQL)    │◀───│    (Redis)      │
                        └──────────────┘    └─────────────────┘
```

### オートスケーリング
- **最小**: 1台
- **最大**: 3台  
- **トリガー**: CPU 70%、メモリ 80%、リクエスト数

## 💰 コスト見積もり

### 月額コスト（使用時のみ）
- **ECS Fargate**: $8-12
- **RDS t3.micro**: $8-10 
- **ElastiCache**: $10-12
- **ALB**: $16
- **NAT Gateway**: $32
- **その他**: $2-4

**合計**: 約 $76-96/月

### 週あたりコスト
- **フル稼働**: $19-24/週
- **20時間/週**: $8-12/週 ← **おすすめ**

## 🔧 メンテナンス

### 手動デプロイ
```bash
# Actions → "Star-Based Deploy Control" → Run workflow
# Action: force_start または force_stop を選択
```

### ログ確認
- CloudWatch Logs: `/ecs/sns-app`
- GitHub Actions: Actions タブ

### 緊急停止
```bash
aws ecs update-service \
  --cluster sns-app-cluster \
  --service sns-app-service \
  --desired-count 0
```

## 📝 注意事項

1. **初回デプロイ**: SSL証明書の発行に15-30分かかります
2. **コスト管理**: 使わない時は必ずStarを外してください
3. **セキュリティ**: GitHub Secretsの値は定期的に更新してください
4. **監視**: CloudWatchでリソース使用量を確認してください

## 🆘 トラブルシューティング

### デプロイ失敗時
1. GitHub Actions のログを確認
2. AWS CloudFormation でスタック状態をチェック
3. ECRにDockerイメージがプッシュされているか確認

### アクセス不可時
1. Route53でDNS設定を確認
2. ALBのヘルスチェック状態を確認
3. セキュリティグループの設定を確認

---

**🌟 楽しいデプロイ体験をお楽しみください！**