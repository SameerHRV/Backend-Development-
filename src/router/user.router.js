import express from 'express'
import { userRegister } from '../controller/user.controller.js'
import { upload } from '../middleware/multer.middleware.js'

const userRouter = express.Router()

userRouter.post(
  '/register',
  upload.fields([
    {
      name: 'avatar',
      maxCount: 1,
      maxSize: 1024 * 1024 * 10, // 10 MB
    },
    {
      name: 'coverImage',
      maxCount: 1,
      maxSize: 1024 * 1024 * 10, // 10 MB
    },
  ]),
  userRegister,
)

export { userRouter }
