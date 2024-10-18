# Redirect HTTP to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name vmi2070714.contaboserver.net;

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS configuration for port 5000
server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name vmi2070714.contaboserver.net;

    ssl_certificate /etc/letsencrypt/live/vmi2070714.contaboserver.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vmi2070714.contaboserver.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS configuration for port 5001
server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name vmi2070714.contaboserver.net;

    ssl_certificate /etc/letsencrypt/live/vmi2070714.contaboserver.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vmi2070714.contaboserver.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
# HTTPS configuration for port 4242
server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name vmi2070714.contaboserver.net;

    ssl_certificate /etc/letsencrypt/live/vmi2070714.contaboserver.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vmi2070714.contaboserver.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /port4242/ {
        proxy_pass http://localhost:4242/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS configuration for port 4200
server {
    listen 443 ssl;
    listen [::]:443 ssl ipv6only=on;
    server_name vmi2070714.contaboserver.net;

    ssl_certificate /etc/letsencrypt/live/vmi2070714.contaboserver.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vmi2070714.contaboserver.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /port4200/ {
        proxy_pass http://localhost:4200/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Default server configuration
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
