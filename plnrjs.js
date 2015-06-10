/*! plnrjs v0.0.0 - MIT license */

'use strict';

/**
 * Module dependencies
 */

/**
 * Module exports
 */

module.exports = (function() {

    var getDeferred = (function() {
        try {
            return require('deferred') // <== 
        }
        catch (_e) {}
        
        if ($ !== undefined && $.Deferred !== undefined) {
            return $.Deferred // <== 
        }

        throw "no deferred impl in context"
    })()
    
    var api = {}

    api.partial = function(f) {
        if (!(f instanceof Function)) {
            throw "not a function" // <== 
        }
        
        var p = [].splice.call(arguments, 0)
        p.shift()
        return function() {
            return f.apply(null, p.concat([].splice.call(arguments, 0)))
        }
    },
    
    api.some = function(s, p) {
        var g = api.generator(s),
            e = undefined
        while ((e = g()) !== undefined) {
            if (p(e)) {
                return true // <==
            }
        }
        
        return false
    }

    api.deferred = getDeferred

    api.resolver = function(d) {
        return function(a) {
            d.resolve(a)
            return d.promise()
        }
    }

    api.waiter = function(f, cont) {
        return function(a) {
            var p = f(a)
            p.done(cont)
            return p
        }
    }

    api.countdownResolver = function(d, count) {
        var cd = count,
            p = d.promise()

        return function(r) {
            if (--cd <= 0) {
                d.resolve(r)
            }
            
            return p
        }
    }
    
    api.wrapper = function(f) {
        return function(v) {
            var d = api.deferred()
            d.resolve(f(v))
            return d.promise()
        }
    }

    api.emptyGenerator = function() {
        return undefined
    }

    api.arrayGenerator = function(a) {
        var n = 0
        return function() {
            if (n === a.length) {
                return undefined
            }
            return a[n++]
        }
    }

    api.objectGenerator = function(o) {
        var n = 0
        return function() {
            var v = o[n++]
            if (v !== undefined) {
                return v
            }
            return undefined
        }
    }
    
    api.generator = function(p) {
        if (p instanceof Array) {
            return api.arrayGenerator(p)
        }
        if (p instanceof Function) {
            return p
        }
        if (p instanceof Object) {
            return api.objectGenerator(p)
        }
        return api.emptyGenerator
    }
    
    api.seq = function(fns) {
        if (!(fns instanceof Array)) {
            return api.seq([].splice.call(arguments, 0))
        }

        return function(p) {
            var d = api.deferred(),
                fs = fns.slice().reverse(),
                pg = api.generator(p)

            fs.reduce(function(cont, f) {
                return function(a) {
                    api.waiter(f, function(res) {
                        a.push(res)
                        cont(a) // Propagate the array holding result values up to the resolver
                    })(pg())
                }
            }, api.resolver(d))([])

            return d.promise()
        }
    }

    api.pipe = function(fns) {
        if (!(fns instanceof Array)) {
            return api.pipe([].splice.call(arguments, 0))
        }

        return function(p) {
            var d = api.deferred(),
                fs = fns.slice().reverse()

            fs.reduce(function(cont, f) {
                return api.waiter(f, cont)
            }, api.resolver(d))(p)

            return d.promise()
        }
    }
    
    api.par = function(fns) {
        if (!(fns instanceof Array)) {
            return api.par([].splice.call(arguments, 0))
        }

        function accumulator(a, v) {
            a.push(v)
            return a
        }

        function positional(a, p, v) {
            var l = a.length
            if (l > p) {
                a[p] = v
                return a // <== 
            }
            
            for (var i = l; i < p; ++i) {
                a.push(undefined)
            }
            a.push(v)
            
            return a
        }
        
        return function(p) {
            var d = api.deferred(),
                fs = fns.slice().reverse(),
                pg = api.generator(p),
                cdr = api.countdownResolver(d, fs.length),
                acc = api.partial(positional, [])

            fs.forEach(function(f, i) {
                f(pg()).done(function(r) {
                    cdr(acc(i, r))
                })
            })

            return d.promise()
        }
    }
    
    return api
})();
