
FROM node:20-alpine
WORKDIR /app
COPY api/package.json .
RUN npm install --omit=dev
COPY api .
EXPOSE 3000
CMD ["npm","start"]
