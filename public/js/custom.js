var clientToken = null
function getNonce(){
    if (clientToken === null){
        $.get( "/client_token", function( data ) {
            clientToken = data;
            preparePayment(clientToken)
        })
    }
}

    function preparePayment(clientToken) {
        var scope = angular.element($("#braintree")).scope()
        //alert("PAYPAL " + scope.getPrice())
        braintree.setup(clientToken, "dropin", {
            container: "dropin-container",
            paypal: {
                singleUse: true,
                amount: scope.getPrice(), //Always 0 TODO
                curreny: 'EUR'
            },
            onPaymentMethodReceived: function (obj) {
                processPayment(obj)
            }
        })
    }

    var socket = io.connect('https://vpn.hugofs.com');

    function processPayment(obj) {
        // Do some logic in here.
        // When you're ready to submit the form:
        document.getElementById("dropin-container").style.display = 'none';
        document.getElementById("optionalForm").style.display = 'none';
        document.getElementById("progress").style.display = 'block';

        var scope = angular.element($("#braintree")).scope()
        socket.emit('purchaseRequest', {
            braintree: obj,
            pgp: document.getElementById("publicPGPKey").value,
            email: document.getElementById("email").value,
            price: scope.getPrice()
        })
    }

    socket.on('payment', function (msg) {
        if (msg === "ok")
            document.getElementById("checkP").className = "fa fa-check"
        else
            document.getElementById("checkP").className = "fa fa-exclamation-circle"
    })
    socket.on('cert', function (msg) {
        if (msg === "ok")
            document.getElementById("checkC").className = "fa fa-check"
        else
            document.getElementById("checkC").className = "fa fa-exclamation-circle"
    })
    socket.on('encrypt', function (msg) {
        if (msg === "ok")
            document.getElementById("checkE").className = "fa fa-check"
        else
            document.getElementById("checkE").className = "fa fa-exclamation-circle"
    })
    socket.on('email', function (msg) {
        if (msg === "ok")
            document.getElementById("checkS").className = "fa fa-check"
        else
            document.getElementById("checkS").className = "fa fa-exclamation-circle"
    })
    socket.on('download', function (msg) {
        var blob = new Blob([msg])
        var url = URL.createObjectURL(blob)
        document.getElementById("downloadDiv").innerHTML = "<i id=\"checkD\" class=\"fa fa-check\"></i>&nbsp;<a download=\"yourOvpnioFiles.zip\" href=\"" + url + "\">Download!</a>"
    })

