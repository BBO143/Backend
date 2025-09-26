# Backend

Backend (Cloudflare Workers + Scaleway Object Storage) servant un style **MapLibre** et les ressources cartographiques.

## Endpoints (Worker)
- **Tiles (vector)** : https://idf-tiles.idf-maps-007.workers.dev/tiles/\{z\}/\{x\}/\{y\}.pbf  
- **Sprites**        : https://idf-tiles.idf-maps-007.workers.dev/sprite  
- **Glyphs (fonts)** : https://idf-tiles.idf-maps-007.workers.dev/fonts/\{fontstack\}/\{range\}.pbf  
- **Style JSON**     : https://idf-tiles.idf-maps-007.workers.dev/style.json\?v\=\<version\>

## Déploiement rapide
```bash
cd backend
wrangler deploy
# Backend
