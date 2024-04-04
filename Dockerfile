FROM node:16

WORKDIR /src/app

COPY package.json .

COPY . .

RUN npm install

COPY node_modules/@vladmandic/human/dist ./human-dist

ENTRYPOINT node app.js

USER node