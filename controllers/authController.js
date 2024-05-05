const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude } = require('../helpers/index')

const prisma = new PrismaClient()

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
      err.message = 'Invalid credentials'
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
    err.message =
      err.code == 'P2025' ? 'Data row not found' : 'Failed to get user'
    next(err)
  }
})

// update user
router.put(
  '/user',
  async (req, res, next) => {
    req.body.userRoleId = parseInt(req.body.userRoleId)
    req.body.userStatusId = parseInt(req.body.userStatusId)

    const result = await z
      .object({
        userRoleId: z.number(),
        userStatusId: z.number(),
        username: z.string(),
        password: z.string().optional(),
        passwordConfirmation: z.string().optional(),
        name: z.string(),
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
      err.message = 'Failed to update user'
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
    err.message =
      err.code == 'P2025' ? 'Data row not found' : 'Failed to get user'
    next(err)
  }
})

module.exports = router
