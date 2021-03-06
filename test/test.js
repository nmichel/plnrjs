var should = require('should')
var plnrjs = require('../plnrjs')

describe('plnrjs', function () {
    it('exists', function () {
        should(plnrjs.resolver).not.eql(undefined)
    })
})

describe('resolver', function() {
    it('can simply notify when resolved', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.resolver(d)
             
        r(42).done(function(v) {
            should(v).equal(42)
            done()
        })
    })
})

describe('waiter', function() {
    it('schedules async task', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.resolver(d),
            w = plnrjs.waiter(r, function(v) {
                should(v).equal(42)
            })

        w(42).done(function() {done()})
    })
    
    it('returns a promise', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.resolver(d),
            w = plnrjs.waiter(r, function() {})
             
        w().done(done)
    })
})

describe('countdownResolver', function() {
    it('countdowns before resolving', function(done) {
        var d = plnrjs.deferred(), 
            r = plnrjs.countdownResolver(d, 5)
        d.promise().done(done)
        r()
        r()
        r()
        r()
        r()
    })
    
    it('returns a promise', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.countdownResolver(d, 5),
            c = 0,
            a = [],
            f = function() {
                a.push(++c)
            }
        r().done(f)
        r().done(f)
        r().done(f)
        r().done(f)
        r().done(f)
        d.promise().done(function() {
            a.should.eql([1, 2, 3, 4, 5])
            done()
        })
    })
})

var schedule = (function() {
    try {
        return window.setTimeout // <== 
    }
    catch(_e) {}
        
    return setTimeout
})()

function sleeper(delayInMs) {
    return function(v) {
        var d = plnrjs.deferred()
        schedule(function() {
            d.resolve(v)
        }, delayInMs)
        return d.promise()
    }
}

describe('seq', function() {
    it('handles varargs form', function(done) {
        this.timeout(2100)
        plnrjs.seq(sleeper(1000), sleeper(1000))().done(function() {
            done()
        })
    })
    
    it('executes in order', function(done) {
        this.timeout(2100)
        plnrjs.seq([sleeper(1000), sleeper(1000)])().done(function() {
            done()
        })
    })
    
    it('can receive parameters', function(done) {
        function check(a, b) {
            should(a).equal(b)
        }

        var s = plnrjs.seq([plnrjs.wrapper(plnrjs.partial(check, 'a')),
                            plnrjs.wrapper(plnrjs.partial(check, 42))])
        s(['a', 42]).done(function() {
            done()
        })
    })
    
    it('accumulates results', function(done) {
        function add(v) {
            return v + 1 
        }

        var s = plnrjs.seq([plnrjs.wrapper(add),plnrjs.wrapper(add)])         
        s([3, 42]).done(function(r) {
            should(r).eql([4, 43])
            done()
        })
    })
    
    it('can be short', function(done) { 
        var seq = plnrjs.seq
        
        var inc = function(v) { return v+1 },
            incw = plnrjs.wrapper(inc)
         
        var s = seq(seq(incw, incw), seq(incw, incw))
        s([[1, 2], [3, 4]]).done(function(r) {
            should(r).eql([[2, 3], [4, 5]])
            done()
        })
    })
    
    it('is idempotent', function(done) { 
        var seq = plnrjs.seq
        
        var inc = function(v) { return v+1 },
            incw = plnrjs.wrapper(inc)

        var s = seq(incw, incw),
            s2 = seq(s, s)
        s2([[1, 2], [3, 4]]).done(function(r) {
            should(r).eql([[2, 3], [4, 5]])
            done()
        })
    })
})

describe('par', function() {
    it('executes simultaneously', function(done) {
        this.timeout(1100)
        plnrjs.par(sleeper(1000), sleeper(1000))().done(function() {
            done()
        })
    })
    
    it('accumulates results in order', function(done) {
        var inc = function(v) { return v+1 },
            incw = plnrjs.wrapper(inc)

        var p = plnrjs.par(incw, sleeper(1000), incw, sleeper(500), incw)             
        p([1,,2,,3]).done(function(r) {
            should(r).eql([2, undefined, 3, undefined, 4])
            done()
        })
    })
})

describe('pipe', function() {
    it('executes in order', function(done) {
        this.timeout(2100)
        plnrjs.pipe([sleeper(1000), sleeper(1000)])().done(function() {
            done()
        })
    })
    
    it('propagates results downstream', function(done) {
        var inc = function(v) { return v+1 },
            incw = plnrjs.wrapper(inc)
        var p = plnrjs.pipe(incw, incw, incw)
        p(1).done(function(r) {
            should(r).equal(4)
            done()
        })
    })
})

describe('it is fun', function() {
    var seq = plnrjs.seq,
        par = plnrjs.par,
        pipe = plnrjs.pipe,
        wrapper = plnrjs.wrapper


    var c = 0,
        gen = function() {
            return ++c
        }
        
    var inc = function(v) { return v+1 },
        incw = wrapper(inc),
        dblw = wrapper(function(v) { return v*2 })

    var combo = pipe(seq(incw, incw, incw), // [1, 2, 3] -> [2, 3, 4]
                     par(dblw, dblw, dblw), // -> [4, 6, 8]
                     wrapper(function(a) {
                         return a.reduce(function(p, c) {
                             return p+c
                         }, 0)
                     })) 
    
    it('to combine seq and par with pipe', function(done) {
        combo(gen).done(function(r) {
            should(r).equal(18) // 4 + 6 + 8 => 18 !
            done()
        })
    })
    
    it('to see side effect', function(done) {
        combo(gen).done(function(r) { // Same (stateful) generator !!
            should(r).equal(36)
            done()
        })
    })
            
    it('to control side effect', function(done) {
        c = 0 // "Reseed"" generator         
        combo(gen).done(function(r) {
            should(r).equal(18)
            done()
        })
    })
    
    it('to avoid side effect', function(done) {
        var gengen = function() {
            var c = 0
            return function() {
                return ++c
            }
        }
        par(combo, combo)([gengen(), gengen()]).done(function(r) {
            should(r).eql([18, 18])
            done()
        })
    })
})
