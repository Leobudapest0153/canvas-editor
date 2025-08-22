# Etapa 1: Compilar la app Vue
FROM node:22.15.0-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copia el build al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]