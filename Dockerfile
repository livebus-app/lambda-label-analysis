FROM public.ecr.aws/lambda/nodejs:18

# COPY dist/app.js prisma .env package*.json ./
COPY dist/app.js prisma package*.json ./
# RUN npx prisma generate
RUN npm ci --omit=dev
CMD [ "app.main" ]
