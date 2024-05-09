require('dotenv').config()

const express = require('express')
const app = express()
const path = require('path')
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override')
const helmet = require('helmet')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

// security
app.use(helmet())
app.disable('x-powered-by')

// allow json & form data
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// allow cookie
app.use(cookieParser())

// allow PUT and DELETE method
app.use(methodOverride())

// allow static files routes
app.use('/static', express.static(path.join(__dirname, 'public')))

// redirect to api routes only
app.get('/', (req, res) => {
  res.redirect('/api')
})

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'I AM YOUR FATHER!'
  })
})

// controller routes
const authController = require('./controllers/authController')
const userController = require('./controllers/userController')
const userRoleController = require('./controllers/userRoleController')
const userStatusController = require('./controllers/userStatusController')
const postController = require('./controllers/postController')
app.use('/api/auth', authController)
app.use('/api/users', userController)
app.use('/api/user-roles', userRoleController)
app.use('/api/user-statuses', userStatusController)
app.use('/api/posts', postController)

// handling error
app.use(notFound)
app.use(errorHandler)

// listen to the port
const port = process.env.APP_PORT || 3000
app.listen(port, () => {
  console.log(`Server running in ${process.env.APP_ENV} on port ${port}`)
})
