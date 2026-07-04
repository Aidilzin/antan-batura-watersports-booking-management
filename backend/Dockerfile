# Antan Batura — Laravel backend runtime (dev)
# PHP 8.4 CLI with the extensions Laravel 13 + MySQL need.
FROM php:8.4-cli

# System deps for the PHP extensions we build below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libpng-dev libonig-dev libxml2-dev \
    && docker-php-ext-install pdo_mysql mbstring bcmath zip gd exif \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer (copied from the official image).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# The source is bind-mounted via docker-compose, so we don't COPY it here.
# `php artisan serve` binds to 0.0.0.0 so the host can reach it.
EXPOSE 8000
CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=8000"]
