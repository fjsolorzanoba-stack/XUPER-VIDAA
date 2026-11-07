FROM node:20-bookworm-slim

# Instalar FFmpeg para soportar el "Modo Fluido" (relay fMP4) también en la nube
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY tools ./tools
COPY webos ./webos
COPY version.json ./

ENV NODE_ENV=production
ENV PORT=8899

EXPOSE 8899

CMD ["node", "tools/vidaa_server.mjs"]
