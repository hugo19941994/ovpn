// Load required modules
var http = require('http')
var fs = require('fs')
var uuid = require('node-uuid')
var openpgp = require('openpgp')
var nodemailer = require('nodemailer')
var smtpTransport = require ('nodemailer-smtp-transport')
var sassMiddleware = require('node-sass-middleware')
var exec = require('child_process').exec
var braintree = require("braintree")
var express = require('express')
var archiver = require('archiver')
var bodyParser = require('body-parser')
app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))
var server = require('http').Server(app)
var io = require('socket.io')(server)

app.use(
    sassMiddleware({
        src: __dirname + '/public/sass',
        dest: __dirname + '/public/css',
        debug: true,
        prefix: '/css'
    })
)

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html')
})

// Braintree integration
var gateway = braintree.connect({
    environment:  braintree.Environment.Production,
    merchantId:   '8w9f7f9gb5nm5z9x',
    publicKey:    '2jtqd8krxnv29hd3',
    privateKey:   process.env.BRAINTREE_SECRET
})

app.get("/client_token", function (req, res) {
    gateway.clientToken.generate({}, function (err, response) {
        res.send(response.clientToken)
    })
})

io.on('connection', function (socket) {
    socket.on('purchaseRequest', function(msg){
        var nonce = msg.braintree.nonce;
        var price = msg.price
        var days = (price - (9/8))*8
        console.log((msg.price - (9/8))*8)
        //var price = 0.01
        //var days = 7
        console.log(msg)
        console.log(nonce)
        console.log(price)
        console.log(msg.email)

        newCert(days, function (randomid) {
            socket.emit('cert', 'ok')
            process.chdir('/srv/ovpn.io/')
            gateway.transaction.sale({
                amount: price,
                paymentMethodNonce: nonce,
                options: {
                    submitForSettlement: true
                }
            }, function (err, result) {
                if (err !== null) {
                    console.log(err)
                }
                else {
                    console.log(result)
                    if(result.success) {
                        socket.emit("payment", "ok")
                        zipCert(randomid, function (buf) {
                            fs.unlink(randomid + ".zip") //Remove the generated zip TODO: stream directly from memory
                            socket.emit("download", buf)
                            if(msg.email != "") {
                                console.log("sending email to " + msg.email)
                                var transporter = nodemailer.createTransport(smtpTransport({
                                    host: 'localhost',
                                    port: 587,
                                    tls : {
                                        rejectUnauthorized: false
                                    }
                                }))
                                var cacrt = fs.readFileSync("/srv/easy-rsa/easyrsa3/pki/ca.crt")
                                var confEx = fs.readFileSync("/srv/ovpn.io/ovpnio.ovpn.example")
                                var conf = confEx + "cert " + randomid + ".crt\nkey " + randomid + ".key"
                                var key = fs.readFileSync("/srv/easy-rsa/easyrsa3/pki/private/" + randomid + ".key")
                                var crt = fs.readFileSync("/srv/easy-rsa/easyrsa3/pki/issued/" + randomid + ".crt")
                                var ta = fs.readFileSync("/srv/easy-rsa/easyrsa3/ta.key")
                                var text = "Thanks for purchasing an ovpn.io certificate\n\nCertificate Autherity (ca.crt)\n\n" + cacrt +
                                    "\n\nYour Private Key - Keep this a secret! (" + randomid + ".key)\n\n" + key + "\n\nYour certificate ("+ randomid + ".crt)\n\n" + crt
                                + "\n\nYour OpenVPN configuration file (ovpnio.ovpn)\n\n" + conf + "\n\nTLS authentication key (ta.key)\n\n" + ta
                                if(msg.pgp != "") {
                                    var publicKey = openpgp.key.readArmored(msg.pgp)
                                    openpgp.encryptMessage(publicKey.keys, text).then(function(pgpMessage) {
                                        socket.emit("encrypt", "ok")
                                        var mailOptions = {
                                            from: "ovpn.io <about@ovpn.io>",
                                            to: msg.email,
                                            subject: "Your ovpn.io files",
                                            text: pgpMessage
                                        }
                                        transporter.sendMail(mailOptions, function(error, info) {
                                            if(error)
                                                console.log(error)
                                            else
                                                console.log(info.response)
                                        })
                                        socket.emit("email", "ok")
                                    }).catch(function(error){
                                        socket.emit("encrypt", "error")
                                        console.log(error)
                                    })
                                }
                                else {
                                    var mailOptions = {
                                        from: "ovpn.io <about@ovpn.io>",
                                        to: msg.email,
                                        subject: "Your ovpn.io files",
                                        text: text
                                    }
                                    transporter.sendMail(mailOptions, function(error, info) {
                                        if(error)
                                            console.log(error)
                                        else
                                            console.log(info.response)
                                    })
                                    socket.emit("email", "ok")
                                    socket.emit("encrypt", "pass")
                                }
                            }
                            else {
                                socket.emit("email", "pass")
                                socket.emit("encrypt", "pass")
                            }
                        })
                    }
                    else {
                        socket.emit("payment", "fail")
                    }
                }
            })
        })
    })
})

function zipCert(randomid, callback) {
    var output = fs.createWriteStream(randomid + ".zip")
    var zip = archiver('zip')
    var confEx = fs.readFileSync("/srv/ovpn.io/ovpnio.ovpn.example")
    var conf = confEx + "cert " + randomid + ".crt\nkey " + randomid + ".key"
    output.on('close', function() {
        fs.readFile(randomid + ".zip", function(err, buf) {
            callback(buf)
        })
    })
    zip.pipe(output)
    zip.append(fs.createReadStream("/srv/easy-rsa/easyrsa3/pki/issued/" + randomid + ".crt"), {name: randomid + ".crt"})
    .append(fs.createReadStream("/srv/easy-rsa/easyrsa3/pki/private/" + randomid + ".key"), {name: randomid + ".key"})
    .append(fs.createReadStream("/srv/easy-rsa/easyrsa3/pki/ca.crt"), {name: "ca.crt"})
    .append(fs.createReadStream("/srv/easy-rsa/easyrsa3/pki/ta.key"), {name: "ta.key"})
    .append(conf, {name: 'ovpnio.ovpn'})
    .finalize()
}

function newCert(days, callback){
    try {
        process.chdir('../easy-rsa/easyrsa3')

        var read = fs.createReadStream('vars.example')
        var write = fs.createWriteStream('vars')

        read.pipe(write)
        read.on('end', function () {
            fs.appendFile("vars", "set_var EASYRSA_CERT_EXPIRE " + days, function(err){
                if (err) console.log(err)
                    var randomid = uuid.v4()
                exec("./easyrsa build-client-full "+  randomid + " nopass", function(error, stdout, stderr) {
                    console.log(stdout)
                    console.log(stderr)
                    if(error !== null){
                        console.log(error)
                    }
                    else {
                        //fs.unlink('vars', callback(randomid))
                        callback(randomid)
                    }
                })
            })
        })
    }
    catch (err) {
        console.log('chdir: ' + err)
    }
}

server.listen(8000);

// Old code!
//var bcrypt = require('bcrypt')
//var crypto = require('crypto')
//var async = require('async')

/* ### Mongo not required for now ###
   var mongoSetup = require("./mongoModule.js")
//MongoDB connection & collections
console.log(mongoSetup.URL)
function insertElements (collection, elements, callback) {
collection.insert(elements)
// Check for errors
callback()
} */

/* ### Login/Registration not required for now
   app.post('/login.js', function(req, res) {
   userCollection.findOne({"email": req.body.email}, function(err, document) {
   if (document == null)
   return
   else {
   bcrypt.compare(req.body.password, document.password, function(err, result) {
   if (result == true)
   console.log("Password matches")
   else
   console.log("Password mismatch")
   res.redirect('/')
   })
   }
   })
   })
   app.post('/register.js', function(req, res) {
   console.log(req.body)
   var buf

   crypto.randomBytes(256, function(err, buf) {
   if (err)
   throw err
   console.log('Have %d bytes of random data: %d', buf.length, buf);
   console.log(buf.toString('hex'))
   bcrypt.genSalt(10, function(err, salt) {
   bcrypt.hash(req.body.password, salt, function(err, hash) {
   insertElements(userCollection, {"email": req.body.email, "password": hash, "validationId": buf, "verified": false}, function() {
   res.redirect('/')
   })
   })
   })
   })
   }) */

