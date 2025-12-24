# Dockerfile for Tech Watch Frontend (static site)
FROM nginx:1.25-alpine

COPY ../frontend/static /usr/share/nginx/html/static
COPY ../frontend/index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
