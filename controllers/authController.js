const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const multer = require('multer')
const fs = require('node:fs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude } = require('../helpers/index')

const prisma = new PrismaClient()

// multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/user-photo')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 2 // 2mb
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == 'image/png' ||
      file.mimetype == 'image/jpg' ||
      file.mimetype == 'image/jpeg'
    ) {
      cb(null, true)
    } else {
      const err = new Error('Invalid mime type')
      err.code = 'INVALID_MIME_TYPE'
      return cb(err)
    }
  }
})

// login
router.post(
  '/',
  async (req, res, next) => {
    const result = await z
      .object({
        username: z.string(),
        password: z.string()
      })
      .safeParseAsync(req.body)

    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: 'Validation Error',
        data: result.error.flatten().fieldErrors
      })
    }

    req.data = result.data
    next()
  },
  async (req, res, next) => {
    try {
      // check username
      const userCheck = await prisma.user.findFirst({
        where: {
          username: req.data.username
        }
      })
      if (!userCheck) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // check password
      const passwordCheck = await bcrypt.compare(
        req.data.password,
        userCheck.password
      )
      if (!passwordCheck) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // generate jwt token
      const days = 30 // days
      const user = exclude(userCheck, ['password'])
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: `${days} days`
      })

      res.json({
        success: true,
        message: 'Login successfully',
        data: {
          user,
          user_token: {
            type: 'bearer',
            token,
            expiresAt: new Date(
              new Date().getTime() + days * 24 * 60 * 60 * 1000
            ).toISOString()
          }
        }
      })
    } catch (err) {
      next(err)
    }
  }
)

// auth user only
router.use(authGuard)

router.get('/user', async (req, res, next) => {
  try {
    const userGet = await prisma.user.findUniqueOrThrow({
      where: {
        id: parseInt(req.authUser.id)
      }
    })
    const user = exclude(userGet, ['password'])

    res.json({
      success: true,
      message: 'Get user successfully',
      data: user
    })
  } catch (err) {
    next(err)
  }
})

// update user
router.put(
  '/user',
  upload.single('photo'),
  async (req, res, next) => {
    req.body.userRoleId = parseInt(req.body.userRoleId)
    req.body.userStatusId = parseInt(req.body.userStatusId)
    req.body.photo = req.file ? req.file.filename : null

    const result = await z
      .object({
        userRoleId: z.number(),
        userStatusId: z.number(),
        username: z.string(),
        password: z.string().optional(),
        passwordConfirmation: z.string().optional(),
        name: z.string(),
        photo: z.string().nullable().optional(),
        email: z.string().email()
      })
      .superRefine(async (val, ctx) => {
        // check if password match
        if (val.password && val.password !== val.passwordConfirmation) {
          ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message:
              'The password field and passwordConfirmation field must be the same'
          })
        }

        // check username
        const username = await prisma.user.findFirst({
          where: {
            username: {
              equals: val.username,
              not: req.authUser.username
            }
          }
        })
        if (username) {
          ctx.addIssue({
            code: 'custom',
            path: ['username'],
            message: 'The username is not unique'
          })
        }

        // check email
        const email = await prisma.user.findFirst({
          where: {
            email: {
              equals: val.email,
              not: req.authUser.email
            }
          }
        })
        if (email) {
          ctx.addIssue({
            code: 'custom',
            path: ['email'],
            message: 'The email is not unique'
          })
        }

        // check user role id
        const userRoleId = await prisma.userRole.findUnique({
          where: {
            id: val.userRoleId
          }
        })
        if (!userRoleId) {
          ctx.addIssue({
            code: 'custom',
            path: ['userRoleId'],
            message: 'The userRoleId is not exists'
          })
        }

        // check user status id
        const userStatusId = await prisma.userStatus.findUnique({
          where: {
            id: val.userStatusId
          }
        })
        if (!userStatusId) {
          ctx.addIssue({
            code: 'custom',
            path: ['userStatusId'],
            message: 'The userStatusId is not exists'
          })
        }
      })
      .safeParseAsync(req.body)

    if (!result.success) {
      // remove file
      if (fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (err) {
          return next(err)
        }
      }

      return res.status(422).json({
        success: false,
        message: 'Validation Error',
        data: result.error.flatten().fieldErrors
      })
    }

    delete result.data.passwordConfirmation
    req.data = result.data
    next()
  },
  async (req, res, next) => {
    try {
      if (req.data.password) {
        req.data.password = await bcrypt.hash(req.data.password, 10) // hash password if exist
      }

      await prisma.$transaction(async (tx) => {
        // remove old photo
        if (
          req.data.photo &&
          fs.existsSync(`uploads\\user-photo\\${req.authUser.photo}`)
        ) {
          try {
            fs.unlinkSync(`uploads\\user-photo\\${req.authUser.photo}`)
          } catch (err) {
            return next(err)
          }
        }
        if (!req.data.photo) delete req.data.photo

        const userUpdate = await tx.user.update({
          where: {
            id: req.authUser.id
          },
          data: req.data
        })
        const user = exclude(userUpdate, ['password'])

        res.json({
          success: true,
          message: 'User updated successfully',
          data: user
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

router.get('/refresh-token', async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: parseInt(req.authUser.id)
      }
    })

    const days = 30 // days
    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: `${days} days`
    })

    res.json({
      success: true,
      message: 'Refresh token successfully',
      data: {
        user,
        user_token: {
          type: 'bearer',
          token,
          expiresAt: new Date(
            new Date().getTime() + days * 24 * 60 * 60 * 1000
          ).toISOString()
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
