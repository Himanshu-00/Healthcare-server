FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 7582
CMD node main.js