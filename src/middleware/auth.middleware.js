import jwt from 'jsonwebtoken'
import createHttpError from 'http-errors'
import config from '../config/config.js'
import { User } from '../models/user.model.js'

export const verifyJWTToken = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw new createHttpError(401, 'Access token is required')
    }

    const decodedToken = jwt.verify(token, config.jwt.jwtAccessToken)

    const user = User.findById(decodedToken?._id).select(
      '-password -refreshToken',
    )

    if (!user) {
      throw new createHttpError(401, 'Invalid access token')
    }

    req.user = user
    next()
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while verifying the JWT token',
      error: error,
    })
  }
}
