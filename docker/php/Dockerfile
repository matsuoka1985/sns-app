FROM php:8.2.28-fpm-alpine

# ---------- PHP 拡張 -----------
RUN apk add --no-cache icu-dev zlib-dev libzip-dev oniguruma-dev mysql-client \
  && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
  && docker-php-ext-install pdo_mysql zip intl bcmath mbstring \
  && pecl install apcu redis \
  && docker-php-ext-enable apcu redis \
  && apk del .build-deps

# ---------- Composer ----------
RUN curl -sS https://getcomposer.org/installer | php -- \
  --install-dir=/usr/local/bin --filename=composer

# ---------- bash + Node 20 LTS ----------
RUN apk add --no-cache bash make nodejs-lts npm



WORKDIR /var/www
