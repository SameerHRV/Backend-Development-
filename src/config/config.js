import { config as conf } from 'dotenv'

conf({
  path: './.env',
})

const config = {
  port: process.env.PORT || 8000,
  mongodbUri: process.env.MONGODB_URI,
  cors: process.env.CORS_ORIGIN,
  jwt: {
    jwtAccessToken: process.env.ACCESS_TOKEN_SECRET,
    jwtRefreshToken: process.env.REFRESH_TOKEN_SECRET,
  },

  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
}

export default config
