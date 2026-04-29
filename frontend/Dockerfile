FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier le code
COPY . .

# Build l'app
RUN npm run build

# Expose le port de dev server
EXPOSE 5173

# Dev server avec HMR
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
