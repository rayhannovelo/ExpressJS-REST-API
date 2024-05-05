const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude, excludeMany } = require('../helpers/index')

const prisma = new PrismaClient()

// auth user only
router.use(authGuard)

// get users
router.get('/', async (req, res) => {
  const usersGet = await prisma.user.findMany()
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

// store user
router.post(
  '/',
  async (req, res, next) => {
    req.body.userRoleId = parseInt(req.body.userRoleId)
    req.body.userStatusId = parseInt(req.body.userStatusId)

    const result = await z
      .object({
        userRoleId: z.number(),
        userStatusId: z.number(),
        username: z.string(),
        password: z.string(),
        passwordConfirmation: z.string(),
        name: z.string(),
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
      err.message = 'Failed to create user'
      next(err)
    }
  }
)

// update user
router.put(
  '/:id',
  async (req, res, next) => {
    req.body.id = parseInt(req.params.id)
    req.body.userRoleId = parseInt(req.body.userRoleId)
    req.body.userStatusId = parseInt(req.body.userStatusId)

    const result = await z
      .object({
        id: z.number(),
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

        // check user id
        const id = await prisma.user.findUnique({
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
      err.message = 'Failed to update user'
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
    err.message =
      err.code == 'P2025' ? 'Data row not found' : 'Failed to delete user'
    next(err)
  }
})

module.exports = router
