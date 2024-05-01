const stackTraceParser = require('stacktrace-parser')

const notFound = (req, res, next) => {
  const err = new Error(`Route not found - ${req.originalUrl}`)
  res.status(404)
  next(err)
}

const errorHandler = (err, req, res, next) => {
  console.log(err)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode

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
