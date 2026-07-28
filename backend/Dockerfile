FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Generate the Prisma client against the schema baked into the image.
RUN npx prisma generate

RUN mkdir -p uploads

EXPOSE 5000

# Apply any pending migrations, then start the server.
CMD sh -c "npx prisma migrate deploy && node src/index.js"
