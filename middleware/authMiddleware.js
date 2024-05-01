const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { exclude } = require('../helpers/index')

const prisma = new PrismaClient()

const authGuard = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      req.authUser = await prisma.user.findUniqueOrThrow({
        where: {
          id: parseInt(decoded.id)
        }
      })

      next()
    } catch (err) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access'
      })
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'Token not found'
    })
  }
}

module.exports = { authGuard }
