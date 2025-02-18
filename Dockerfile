FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass environment variables during build time
ARG VITE_STRIPE_PUBLIC_KEY
ARG VITE_ORIGIN
ARG VITE_API_BASE_URL
ARG VITE_BACKEND_URL

ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV VITE_ORIGIN=$VITE_ORIGIN
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Set production defaults if not provided
ENV VITE_ORIGIN=${VITE_ORIGIN:-https://frontend-production-2748.up.railway.app}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://backend-production-6e08.up.railway.app/api/v1}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL:-https://backend-production-6e08.up.railway.app}

RUN npm run build

EXPOSE ${PORT}

CMD ["npm", "start"]
