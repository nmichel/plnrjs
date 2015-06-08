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
             
        r().done(done)
    })
})

describe('waiter', function() {
    it('schedules async task', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.resolver(d),
            w = plnrjs.waiter(r, done)

        w()
        d.resolve()
    })
    
    it('returns a promise', function(done) {
        var d = plnrjs.deferred(),
            r = plnrjs.resolver(d),
            w = plnrjs.waiter(r, function() {})
             
        w().done(done)
        d.resolve()
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

function immediate() {
    return function() {
        var d = plnrjs.deferred()
        d.resolve() 
        return d.promise()
    }
}

function sleeper(delayInMs) {
    return function() {
        var d = plnrjs.deferred()
        schedule(function() {
            d.resolve()
        }, delayInMs)
        return d.promise()
    }
}

describe('seq', function() {
    it('executes in order', function(done) {
        this.timeout(2100)
        plnrjs.seq(sleeper(1000), sleeper(1000))().done(done)
    })
})

describe('par', function() {
    it('executes simultaneously', function(done) {
        this.timeout(1100)
        plnrjs.par(sleeper(1000), sleeper(1000))().done(done)
    })
})
