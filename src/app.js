import express from 'express'
import { globalAsnycErrorHandler } from './utils/globalAsnycErrorHandler.js'
import config from './config/config.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

const limit = '50mb'

app.use(
  cors({
    origin: config.cors,
    credentials: true,
  }),
)

app.use(
  express.json({
    limit: limit,
    extended: true,
  }),
)
app.use(
  express.urlencoded({
    extended: true,
    limit: limit,
  }),
)
app.use(express.static('public'))

app.use(cookieParser())

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World!',
  })
})

// error handler
app.use(globalAsnycErrorHandler)

export default app
