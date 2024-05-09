const express = require('express')
const router = express.Router()
const z = require('zod')
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const { authGuard } = require('../middleware/authMiddleware')
const { exclude, excludeMany } = require('../helpers/index')

const prisma = new PrismaClient()

// auth post only
router.use(authGuard)

// get posts
router.get('/', async (req, res) => {
  const posts = await prisma.post.findMany({
    include: {
      user: {
        include: {
          userRole: true,
          userStatus: true
        }
      }
    }
  })

  res.json({
    success: true,
    message: 'Get posts successfully',
    data: posts
  })
})

// get post
router.get('/:id', async (req, res, next) => {
  try {
    const post = await prisma.post.findUniqueOrThrow({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Get post successfully',
      data: post
    })
  } catch (err) {
    next(err)
  }
})

// store post
router.post(
  '/',
  async (req, res, next) => {
    const result = await z
      .object({
        title: z.string(),
        body: z.string()
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
        req.data.userId = req.authUser.id
        const post = await tx.post.create({
          data: req.data
        })

        res.json({
          success: true,
          message: 'Post created successfully',
          data: post
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// update post
router.put(
  '/:id',
  async (req, res, next) => {
    req.body.id = parseInt(req.params.id)

    const result = await z
      .object({
        id: z.number(),
        title: z.string(),
        body: z.string()
      })
      .superRefine(async (val, ctx) => {
        // check id
        const id = await prisma.post.findUnique({
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
        const post = await tx.post.update({
          where: {
            id: req.body.id
          },
          data: req.data
        })

        res.json({
          success: true,
          message: 'Post updated successfully',
          data: post
        })
      })
    } catch (err) {
      next(err)
    }
  }
)

// delete post
router.delete('/:id', async (req, res, next) => {
  try {
    const post = await prisma.post.delete({
      where: {
        id: parseInt(req.params.id)
      }
    })

    res.json({
      success: true,
      message: 'Delete post successfully'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
