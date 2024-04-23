import createHttpError from 'http-errors'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../config/cloudinary.js'

const generateAccessAndRefreshToken = async userId => {
  try {
    const user = await User.findById(userId)
    const accessToken = await user.generateAccessToken()
    const refreshToken = await user.generateRefreshToken()

    // user.accessToken = accessToken
    user.refreshToken = refreshToken
    await user.save({
      validateBeforeSave: false,
    })

    return {
      accessToken,
      refreshToken,
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while generating access and refresh token',
      error: error,
    })
  }
}

const userRegister = async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  try {
    // check if all required fields are present
    const { fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
      [fullName, email, username, password].some(field => field?.trim() === '')
    ) {
      throw new createHttpError(400, 'All fields are required')
    }

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    })

    if (existedUser) {
      throw new createHttpError(
        409,
        'User with email or username already exists',
      )
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
      throw new createHttpError(400, 'Avatar file is required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
      throw new createHttpError(400, 'Avatar file is required')
    }

    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || '',
      email,
      password,
      username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
      '-password -refreshToken',
    )

    if (!createdUser) {
      throw new createHttpError(
        500,
        'Something went wrong while registering the user',
      )
    }

    return res.status(200).json({
      message: 'User created successfully',
      userId: createdUser._id,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while registering the user',
      error: error,
    })
  }
}

const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body
    if (!username && !email) {
      throw new createHttpError(400, 'Username or email is required')
    }

    const user = User.findOne({ $or: [{ username }, { email }] }).select(
      '-password -refreshToken',
    )

    if (!user) {
      throw new createHttpError(404, 'User not found')
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
      throw new createHttpError(401, 'Invalid password')
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id,
    )

    const logginedUser = User.findById(user._id).select(
      '-password -refreshToken',
    )

    // cookie

    const options = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      signed: true,
    }

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options)
      .json(200, {
        message: 'User logged in successfully',
        userId: logginedUser._id,
      })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while logging in the user',
      error: error,
    })
  }
}

const logoutUser = async (req, res) => {
  try {
    User.findByIdAndUpdate(req.user._id, {
      $set: {
        accessToken: null,
        refreshToken: null,
      },
    })

    const options = {
      expires: new Date(Date.now() - 1000), // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      signed: true,
    }

    return res
      .status(200)
      .cookie('accessToken', '', options)
      .cookie('refreshToken', '', options)
      .json(200, {
        message: 'User logged out successfully',
      })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while logging out the user',
      error: error,
    })
  }
}

export { userRegister, loginUser, logoutUser }
