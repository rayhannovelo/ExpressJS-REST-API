const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { exclude } = require('../helpers/index')
const { authGuard } = require('../middleware/authMiddleware')

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

    return next()
  },
  async (req, res, next) => {
    try {
      // check username
      const userCheck = await prisma.user.findFirst({
        where: {
          username: req.body.username
        }
      })
      if (!userCheck) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // check password
      const passwordCheck = await bcrypt.compare(
        req.body.password,
        userCheck.password
      )
      if (!passwordCheck) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        })
      }

      // generate jwt token
      const user = exclude(userCheck, ['password'])
      const days = 30 // days
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
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: parseInt(req.authUser.id)
      }
    })

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
