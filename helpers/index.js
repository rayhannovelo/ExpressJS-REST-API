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

// Exclude keys from user
function exclude(user, keys) {
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => !keys.includes(key))
  )
}

module.exports = { camelToSnake, exclude }
