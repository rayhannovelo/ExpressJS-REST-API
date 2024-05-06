const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude, excludeMany } = require('../helpers/index')

const prisma = new PrismaClient()

// auth user role only
router.use(authGuard)

// get user roles
router.get('/', async (req, res) => {
  const userRoles = await prisma.userRole.findMany()

  res.json({
    success: true,
    message: 'Get user roles successfully',
    data: userRoles
  })
})

// get user role
router.get('/:id', async (req, res, next) => {
  try {
    const userRole = await prisma.userRole.findUniqueOrThrow({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Get user role successfully',
      data: userRole
    })
  } catch (err) {
    next(err)
  }
})

// store user role
router.post(
  '/',
  async (req, res, next) => {
    const result = await z
      .object({
        userRoleName: z.string(),
        userRoleDescription: z.string().optional()
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
        const userRole = await tx.userRole.create({
          data: req.data
        })
        res.json({
          success: true,
          message: 'User role created successfully',
          data: userRole
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// update user role
router.put(
  '/:id',
  async (req, res, next) => {
    req.body.id = parseInt(req.params.id)

    const result = await z
      .object({
        id: z.number(),
        userRoleName: z.string(),
        userRoleDescription: z.string().optional()
      })
      .superRefine(async (val, ctx) => {
        // check user id
        const id = await prisma.userRole.findUnique({
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
        const userRole = await tx.userRole.update({
          where: {
            id: req.body.id
          },
          data: req.data
        })

        res.json({
          success: true,
          message: 'User role updated successfully',
          data: userRole
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// delete user role
router.delete('/:id', async (req, res, next) => {
  try {
    const userRole = await prisma.userRole.delete({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Delete user role successfully'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
