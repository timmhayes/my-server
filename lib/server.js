
var http = require('http')
var package = require('../package.json')
var response = require('./response')

var Server = module.exports = function() {

  var fn = function (req, res) {
    fn.handle(req, res)
  }

  fn.handle = addMethodHandlers(fn)

  fn.headers = {
    'Accept-Ranges': 'bytes',
    'Server': package.name + '/' + package.version
  }

  fn.listen = function () {
    var server = http.createServer(this)
    return server.listen.apply(server, arguments)
  }

  fn.response = { __proto__: response }

  return fn

}

function addMethodHandlers(to) {

  var methodHandlers = {}
  var methodHandler = function (methodName) {
    return function (route, handler, scope) {
      var a = Array.prototype.slice.call(arguments)
      if (typeof a[0] == 'function') a.unshift('/*')
      methodHandlers[methodName].push({
        handler: a[1],
        route: a[0],
        scope: a[2],
        test: toRouteTest(a[0])
      })
      return this
    }
  }

  var methods = ['ALL', 'GET', 'HEAD', 'POST'].concat(http.METHODS)
  methods.forEach(function (METHOD) {
    to[METHOD.toLowerCase()] = methodHandler(METHOD)
    methodHandlers[METHOD] = []
  })

  return function (req, res) {
    res.__proto__ = to.response
    res.req = req
    res.set(to.headers)
    req.path = unescape(req.url).split('?')[0]

    var routes = [].concat(
      methodHandlers['ALL'],
      methodHandlers[req.method]
    )
    .filter(function (route) {
      return route && route.test(req)
    })

    var scope = this
    var next = function () {
      var route = routes.shift()
      if (route) {
        route.handler.call(
          route.scope || scope,
          req, res, next
        )
      }
    }

    next()
  }

}

function is(object, type) {
  return Object.prototype.toString.call(object) === '[object ' + type +']'
}

function toRouteTest(v) {

  var re = v
  var esc = function (s) {
    return s.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, "\\$&")
            .replace(/\*/g, '.*')
  }

  if (is(v, 'String')) {
    if (v.indexOf('*') === -1) {
      re = new RegExp('^' + esc(v) + '$')
    }
    else {
      re = new RegExp(esc(v))
    }
  }

  if (!is(re, 'RegExp')) {
    re = /^\//
  }

  return function (req) {
    return re.test(unescape(req.url))
  }

}
