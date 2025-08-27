#!/bin/bash
set -e

# Firebase認証情報ファイル作成
if [ ! -z "$FIREBASE_CREDENTIALS" ]; then
  echo "$FIREBASE_CREDENTIALS" | base64 -d > /var/www/storage/app/firebase/firebase-adminsdk.json
  echo "Firebase credentials file created"
fi

# マイグレーション実行
php artisan migrate --force
php artisan db:seed --force

# PHP-FPM起動
exec php-fpm -F