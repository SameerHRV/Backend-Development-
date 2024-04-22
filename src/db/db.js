import mongoose from 'mongoose'
import config from '../config/config.js'

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected')
    })

    mongoose.connection.on('error', () => {
      console.log('Error to connecting mongodb database')
    })

    const connectionInstance = await mongoose.connect(config.mongodbUri)
    console.log(
      'MONGODB CONNECTION !! HOST => ',
      connectionInstance.connection.host,
    )
  } catch (error) {
    console.log('Error connecting to database', error)
  }
}

export default connectDB
