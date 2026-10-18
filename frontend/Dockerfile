# --- build: static bundle ---------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Optional ArcGIS developer key. A browser key ends up in the public bundle by design (restrict it by
# referrer in the ArcGIS dashboard); it only lives in this discarded build stage, never in the nginx image.
ARG VITE_ARCGIS_API_KEY=
ARG VITE_ARCGIS_LAYER_URL=https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2
# the ArcGIS SDK makes the bundle large; Node's default heap is not enough
RUN VITE_ARCGIS_API_KEY=$VITE_ARCGIS_API_KEY VITE_ARCGIS_LAYER_URL=$VITE_ARCGIS_LAYER_URL \
    NODE_OPTIONS=--max-old-space-size=4096 npm run build

# --- serve: nginx with /api proxied to the backend ----------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
