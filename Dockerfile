FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove hardcoded PORT
EXPOSE ${PORT}

CMD ["npm", "start"]
