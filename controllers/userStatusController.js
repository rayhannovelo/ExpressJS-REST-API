const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude, excludeMany } = require('../helpers/index')

const prisma = new PrismaClient()

// auth user status only
router.use(authGuard)

// get user statuses
router.get('/', async (req, res) => {
  const userStatuses = await prisma.userStatus.findMany()

  res.json({
    success: true,
    message: 'Get user statuses successfully',
    data: userStatuses
  })
})

// get user status
router.get('/:id', async (req, res, next) => {
  try {
    const userStatus = await prisma.userStatus.findUniqueOrThrow({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Get user status successfully',
      data: userStatus
    })
  } catch (err) {
    next(err)
  }
})

// store user status
router.post(
  '/',
  async (req, res, next) => {
    const result = await z
      .object({
        userStatusName: z.string(),
        userStatusDescription: z.string().optional()
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
      await prisma.$transaction(async (tx) => {
        const userStatus = await tx.userStatus.create({
          data: req.data
        })
        res.json({
          success: true,
          message: 'User status created successfully',
          data: userStatus
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// update user status
router.put(
  '/:id',
  async (req, res, next) => {
    req.body.id = parseInt(req.params.id)

    const result = await z
      .object({
        id: z.number(),
        userStatusName: z.string(),
        userStatusDescription: z.string().optional()
      })
      .superRefine(async (val, ctx) => {
        // check user id
        const id = await prisma.userStatus.findUnique({
          where: {
            id: val.id
          }
        })
        if (!id) {
          ctx.addIssue({
            code: 'custom',
            path: ['id'],
            message: 'The id is not exists'
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

    delete result.data.id
    req.data = result.data
    next()
  },
  async (req, res, next) => {
    try {
      await prisma.$transaction(async (tx) => {
        const userStatus = await tx.userStatus.update({
          where: {
            id: req.body.id
          },
          data: req.data
        })

        res.json({
          success: true,
          message: 'User status updated successfully',
          data: userStatus
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// delete user status
router.delete('/:id', async (req, res, next) => {
  try {
    const userStatus = await prisma.userStatus.delete({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Delete user status successfully'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
