import createHttpError from 'http-errors'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../config/cloudinary.js'
import config from '../config/config.js'

const options = {
  httpOnly: true,
  secure: true,
}

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
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const { email, username, password } = req.body
  console.log(email)

  if (!username && !email) {
    throw new createHttpError(400, 'Username or email is required')
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  })

  if (!user) {
    throw new createHttpError(404, 'User does not exist')
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new createHttpError(401, 'Invalid user credentials')
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  )

  const loggedInUser = await User.findById(user._id).select(
    '-password -refreshToken',
  )

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(200, {
      message: 'User logged in successfully',
      userId: loggedInUser._id,
    })
}

const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    },
  )

  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(200, {
      message: 'User logged out successfully',
    })
}

const refreshAccessToken = async (req, res) => {
  try {
    const inCommingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken

    if (!inCommingRefreshToken) {
      throw new createHttpError(401, 'Access token is required')
    }

    const decodedToken = jwt.verify(
      inCommingRefreshToken,
      config.jwt.jwtRefreshToken,
    )

    const user = await User.findById(decodedToken?._id).select(
      '-password -refreshToken',
    )

    if (!user) {
      throw new createHttpError(401, 'Invalid refresh token')
    }

    if (inCommingRefreshToken !== user?.refreshToken) {
      throw new createHttpError(401, 'Refresh token is invalid or expired')
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id)

    return res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('newRefreshToken', newRefreshToken, options)
      .json(200, {
        message: 'Access token refreshed successfully',
        userId: user._id,
      })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while refreshing the access token',
      error: error,
    })
  }
}

const changeCurrentUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      throw new createHttpError(
        400,
        'Old password and new password are required',
      )
    }
    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
      throw new createHttpError(401, 'Invalid old password')
    }

    user.password = newPassword
    await user.save({
      validateBeforeSave: false,
    })

    return res.status(200).json({
      message: 'Password changed successfully',
      userId: user._id,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while changing the password',
      error: error,
    })
  }
}

const getcurrentUser = async (req, res) => {
  try {
    return res.status(200).json(200, req.user, {
      message: 'Current user fetched successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while getting the current user',
      error: error,
    })
  }
}

const getUserDetails = async (req, res) => {
  try {
    const { fullName, email } = req.body

    if (!fullName || !email) {
      throw new createHttpError(
        400,
        'Full name, email and password are required',
      )
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName,
          email,
        },
      },
      {
        new: true,
      },
    ).select('-password')

    return res.status(200).json({
      message: 'User details updated successfully',
      userId: user._id,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while getting the user details',
      error: error,
    })
  }
}

const updatedUserAvatar = async (req, res) => {
  try {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
      throw new createHttpError(400, 'Avatar file is required')
    }

    // delete the old avatar
    const oldAvatar = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $unset: {
          avatar: 1,
        },
      },
      {
        new: true,
      },
    ).select('-password')

    if (!oldAvatar.avatar) {
      throw new createHttpError(400, 'Avatar file is required')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
      throw new createHttpError(400, 'Avatar file is required')
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      {
        new: true,
      },
    ).select('-password')

    return res.status(200).json({
      message: 'User avatar updated successfully',
      userId: user._id,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while updating the user avatar',
      error: error,
    })
  }
}
const updatedUserCoverImage = async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
      throw new createHttpError(400, 'Cover image file is required')
    }

    // delete the old cover image
    const oldCoverImage = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $unset: {
          coverImage: 1,
        },
      },
      {
        new: true,
      },
    ).select('-password')

    if (!oldCoverImage.coverImage) {
      throw new createHttpError(400, 'Cover image file is required')
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
      throw new createHttpError(400, 'Cover image file is required')
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      {
        new: true,
      },
    ).select('-password')

    return res.status(200).json({
      message: 'User cover image updated successfully',
      user: user,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      message: 'Something went wrong while updating the user cover image',
      error: error,
    })
  }
}

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new createHttpError(400, 'Username is required')
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedTo',
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: '$subscribers',
        },
        channelsSubscribedToCount: {
          $size: '$subscribedTo',
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, '$subscribers.subscriber'] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ])

  if (!channel?.length) {
    throw new createHttpError(404, 'User channel profile not found')
  }

  return res.status(200).json(200, {
    message: 'User channel profile fetched successfully',
    channel: channel[0],
  })
})

export {
  userRegister,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getcurrentUser,
  getUserDetails,
  updatedUserAvatar,
  updatedUserCoverImage,
  getUserChannelProfile,
}
