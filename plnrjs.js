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
    
    api.deferred = getDeferred
        
    api.resolver = function(d) {
        return function() {
            d.resolve()
            return d.promise()
        }
    }

    api.waiter = function(f, cont) {
        return function() {
            var p = f()
            p.done(cont)
            return p
        }
    }

    api.countdownResolver = function(d, count) {
        var cd = count,
            p = d.promise()

        return function() {
            if (--cd <= 0) {
                d.resolve()
            }
            
            return p
        }
    }
    
    api.seq = function(fns) {
        var fs = [].splice.call(arguments, 0).reverse()

        return function() {
            var d = api.deferred()
            
            fs.reduce(function(cont, f) {
                return api.waiter(f, cont)
            }, api.resolver(d))()

            return d.promise()
        }
    }

    api.par = function(fns) {
        var fs = [].splice.call(arguments,0)

        return function() {
            var d = api.deferred(),
                cdr = api.countdownResolver(d, fs.length)

            fs.forEach(function(f) {
                f().done(cdr)
            })

            return d.promise()
        }
    }
    
    return api
})();
