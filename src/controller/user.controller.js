import createHttpError from 'http-errors'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../config/cloudinary.js'

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
  const { username, email, password } = req.body

  if (!username && !email) {
    throw new createHttpError(400, 'Username or email is required')
  }
}

export { userRegister }
