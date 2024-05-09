const stackTraceParser = require('stacktrace-parser')

const notFound = (req, res, next) => {
  const err = new Error(`Route not found - ${req.originalUrl}`)
  res.status(404)
  next(err)
}

const errorHandler = (err, req, res, next) => {
  console.log(err)

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode

  if (err.code == 'P2003') {
    err.message = 'Data that has been used cannot be deleted!'
  } else if (err.code == 'P2025') {
    err.message = 'Data row not found!'
  } else if (err.code) {
    err.message = 'Failed to process!'
  } else {
    err.message = 'Error!'
  }

  const data = {
    success: false,
    message: err.message
  }

  if (process.env.APP_ENV === 'development') {
    data.stack = stackTraceParser.parse(err.stack)
  }

  res.status(statusCode)
  res.json(data)
}

module.exports = { notFound, errorHandler }
