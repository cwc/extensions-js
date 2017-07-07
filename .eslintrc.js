module.exports = {
  root: true,

  parser: 'babel-eslint',

  parserOptions: {
    sourceType: 'module'
  },

  extends: 'airbnb',

  env: {
    browser: true,
    node: true
  },

  settings: {
    ecmascript: 6,
    'import/resolver': {
      webpack: {
        config: 'webpack.config.js'
      }
    }
  },

  rules: {
    // No console or debugger lines in production. Warn in dev, to make it
    // easier to identify them.
    'no-console': process.env.NODE_ENV === 'production' ? 2 : 1,
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 1,

    // ES6 let and const don't hoist variables, so it is an error to use them
    // before they are defined. However, without a good function definition/declaration
    // distinction trying to get definition order correct is ugly at best.
    'no-use-before-define': ['error', { 'functions': false }],

    // Don't allow trailing commas (e.g. ['a',]).
    'comma-dangle': ['error', 'never'],

    // Don't allow reassigning function paramaters.
    'no-param-reassign': 'error'
  }
}
