const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const multer = require('multer')
const fs = require('node:fs')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude, excludeMany } = require('../helpers/index')

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

// auth user only
router.use(authGuard)

// get users
router.get('/', async (req, res) => {
  const usersGet = await prisma.user.findMany({
    include: {
      posts: true
    }
  })
  const users = excludeMany(usersGet, ['password'])

  res.json({
    success: true,
    message: 'Get users successfully',
    data: users
  })
})

// get user
router.get('/:id', async (req, res, next) => {
  try {
    const userGet = await prisma.user.findUniqueOrThrow({
      where: {
        id: parseInt(req.params.id)
      },
      include: {
        posts: true
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

// store user
router.post(
  '/',
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
        password: z.string(),
        passwordConfirmation: z.string(),
        name: z.string(),
        photo: z.string(),
        email: z.string().email()
      })
      .superRefine(async (val, ctx) => {
        // check if password match
        if (val.password !== val.passwordConfirmation) {
          ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message:
              'The password field and passwordConfirmation field must be the same'
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

        // check username
        const username = await prisma.user.findFirst({
          where: {
            username: val.username
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
            email: val.email
          }
        })
        if (email) {
          ctx.addIssue({
            code: 'custom',
            path: ['email'],
            message: 'The email is not unique'
          })
        }
      })
      .safeParseAsync(req.body)

    if (!result.success) {
      // remove file
      if (req.file) {
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
      await prisma.$transaction(async (tx) => {
        req.data.password = await bcrypt.hash(req.data.password, 10)
        const userStore = await tx.user.create({
          data: req.data
        })
        const user = exclude(userStore, ['password'])

        res.json({
          success: true,
          message: 'User created successfully',
          data: user
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// update user
router.put(
  '/:id',
  upload.single('photo'),
  async (req, res, next) => {
    req.body.id = parseInt(req.params.id)
    req.body.userRoleId = parseInt(req.body.userRoleId)
    req.body.userStatusId = parseInt(req.body.userStatusId)
    req.body.photo = req.file ? req.file.filename : null

    const result = await z
      .object({
        id: z.number(),
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

        // check user id
        const user = await prisma.user.findUnique({
          where: {
            id: val.id
          }
        })
        if (!user) {
          ctx.addIssue({
            code: 'custom',
            path: ['id'],
            message: 'The id is not exists'
          })
        } else {
          // check username
          const username = await prisma.user.findFirst({
            where: {
              username: {
                equals: val.username,
                not: user.username
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
                not: user.email
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

    delete result.data.id
    delete result.data.passwordConfirmation
    req.data = result.data
    next()
  },
  async (req, res, next) => {
    try {
      if (req.data.password) {
        req.data.password = await bcrypt.hash(req.data.password, 10)
      }

      await prisma.$transaction(async (tx) => {
        const userGet = await prisma.user.findUniqueOrThrow({
          where: {
            id: parseInt(req.body.id)
          }
        })

        // remove old photo
        if (fs.existsSync(`uploads\\user-photo\\${userGet.photo}`)) {
          try {
            fs.unlinkSync(`uploads\\user-photo\\${userGet.photo}`)
          } catch (err) {
            return next(err)
          }
        }

        const userUpdate = await tx.user.update({
          where: {
            id: req.body.id
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

// delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.delete({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Delete user successfully'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
