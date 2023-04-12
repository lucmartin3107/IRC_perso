appVersion: latest
type: install
id: abattrip
name: abattrip
baseUrl: https://gitlab.com/abattrip/back-abattrip

categories:
  - apps/dev-and-admin-tools

globals:
  symfonyroot: /var/www
description:
  text: /texts/description.md
  short: Open-source PHP web framework for rapid development
ssl: true

nodes:
  - nodeType: nginx
    nodeGroup: bl
    cloudlets: 8
    count: 1
    displayName: loadBalancer 1

  - image: php:8.1.17-fpm
    nodeGroup: cp
    cloudlets: 8
    count: 1
    displayName: backWeb
    volumes:
      - /var/www

  - nodeType: mysql
    nodeGroup: sqldb
    cloudlets: 8
    count: 1
    displayName: SQLDB
    env:
      password: ${fn.password}
    volumes:
      - /var/lib/mysql
    isSLBAccessEnabled: false

onInstall:
  - composer
  - git
  - configure-nginx
  - php
  - symfonyconfig
  - restartNodes:
    - nodeGroup: [cp]

actions:
  composer:
    cmd[cp]: |-
      curl -sS https://getcomposer.org/installer | php
      mv composer.phar /usr/bin/composer
      chmod +x /usr/bin/composer
    user: root

  git:
    cmd[cp]: |-
      apt-get install -yqq --no-install-recommends git
    user: root

  configure-nginx:
    cmd[cp]: |-
      cat > /etc/nginx/sites-enabled/default << 'EOF'
      server {
        listen 80 default_server;
        listen [::]:80 default_server;
        root /var/www/public;
        index index.php index.html index.htm;
        error_log /var/log/nginx/project_error.log;
        access_log /var/log/nginx/project_access.log;
        server_name _;
        location / {
          try_files $uri $uri/ /index.php$is_args$args;
        }
        location ~ \.php$ {
          include fastcgi_params;
          fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
          fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
          fastcgi_param PATH_INFO $fastcgi_path_info;
          fastcgi_param HTTPS on;
        }
        location ~ \\.php$ {
          return 404;
        }
      }
      EOF
      systemctl restart nginx
    user: root

  php:
    cmd[cp]: |-
      curl -sSLf \
        -o /usr/local/bin/install-php-extensions \
        https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions && \
        chmod +x /usr/local/bin/install-php-extensions && \
        install-php-extensions intl pdo pdo_mysql mysql redis amqp
    user: root

  symfonyconfig:
    cmd[cp]: |-
      cd ${globals.symfonyroot}
      git clone https://gitlab.com/abattrip/back-abattrip.git
      cd ${globals.symfonyroot}/back-abattrip
      composer install
      chown -R nginx.nginx ${globals.symfonyroot}/back-abattrip
      chmod -R 755 ${globals.symfonyroot}/back-abattrip
      cp .env.example .env
    user: root
