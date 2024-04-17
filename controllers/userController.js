const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// get users
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany()

  res.json({
    success: true,
    message: 'Get users successfully',
    data: users
  })
})

// get user
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: parseInt(req.params.id)
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
        // check if passowrd match
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

    return next()
  },
  async (req, res, next) => {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            userRoleId: req.body.userRoleId,
            userStatusId: req.body.userStatusId,
            username: req.body.username,
            password: await bcrypt.hash(req.body.password, 10),
            name: req.body.name,
            email: req.body.email
          }
        })

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
        password: z.string(),
        passwordConfirmation: z.string(),
        name: z.string(),
        email: z.string().email()
      })
      .superRefine(async (val, ctx) => {
        // check if passowrd match
        if (val.password !== val.passwordConfirmation) {
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

    return next()
  },
  async (req, res, next) => {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: {
            id: req.body.id
          },
          data: {
            userRoleId: req.body.userRoleId,
            userStatusId: req.body.userStatusId,
            username: req.body.username,
            password: await bcrypt.hash(req.body.password, 10),
            name: req.body.name,
            email: req.body.email
          }
        })

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
