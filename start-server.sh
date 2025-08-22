#!/bin/bash
# Script para iniciar el servidor Face Recognition UI con SSL para la IP específica

# Detener contenedores previos si existen
echo "Deteniendo contenedores previos..."
docker-compose down

# Reconstruir y reiniciar el contenedor
echo "Iniciando servidor..."
docker-compose up -d --build

echo "¡Servicio iniciado!"
sleep 2
