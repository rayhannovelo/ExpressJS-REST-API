function camelToSnake(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj // If obj is not an object, return it unchanged
  }

  const snakeCaseObject = {} // Initialize an empty object to store the converted keys

  for (const [key, value] of Object.entries(obj)) {
    const snakeCaseKey = key.replace(
      /[A-Z]/g,
      (match) => `_${match.toLowerCase()}`
    )
    snakeCaseObject[snakeCaseKey] = camelToSnake(value) // Recursively convert nested objects
  }

  return snakeCaseObject
}

// exclude keys prisma
function exclude(data, keys) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !keys.includes(key))
  )
}

function excludeMany(data, keys) {
  const obj = []
  Object.entries(data).forEach((value) => {
    obj.push(
      Object.fromEntries(
        Object.entries(value[1]).filter(([key]) => !keys.includes(key))
      )
    )
  })

  return obj
}

module.exports = { camelToSnake, exclude, excludeMany }
