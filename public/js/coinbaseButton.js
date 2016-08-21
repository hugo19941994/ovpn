(function() {
  var main;

  main = function(window, document, version, callback) {
    var compatible, d, j, jMajor, jMinor, loaded, ref, script, vMajor, vMinor;
    ref = [null, null, false], j = ref[0], d = ref[1], loaded = ref[2];
    if (j = window.jQuery) {
      vMajor = parseInt(version.split('.')[0]) || 0;
      vMinor = parseInt(version.split('.')[1]) || 0;
      jMajor = parseInt(j.fn.jquery.split('.')[0]) || 0;
      jMinor = parseInt(j.fn.jquery.split('.')[1]) || 0;
      compatible = (jMajor > vMajor) || (jMajor === vMajor && jMinor >= vMinor);
    }
    if (!j || !compatible || callback(j, loaded)) {
      script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js";
      script.onload = script.onreadystatechange = function() {
        if (!loaded && (!(d = this.readyState) || d === "loaded" || d === "complete")) {
          callback((j = window.jQuery).noConflict(1), loaded = true);
          return j(script).remove();
        }
      };
      return (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script);
    }
  };

  main(window, document, "1.7", function($, jquery_loaded) {
    var buttonFrameLoaded, checkoutsFrameLoaded, default_height, default_width, host, receive_message, setHost;
    buttonFrameLoaded = false;
    checkoutsFrameLoaded = false;
    host = "https://www.coinbase.com";
    setHost = function(env) {
      if (env === 'development' || env === 'test') {
        return host = document.location.protocol + "//" + document.location.host;
      } else if (env === 'sandbox') {
        return host = "https://sandbox.coinbase.com";
      }
    };
    receive_message = function(e) {
      var buttonId, command, ref;
      ref = e.data.split('|'), command = ref[0], buttonId = ref[1];
      buttonId = escape(buttonId);
      if (e.origin !== host) {
        return;
      }
      if (command === "show modal iframe") {
        return $('#coinbase_modal_iframe_' + buttonId).show();
      } else if (command === "coinbase_payment_complete") {
        $('#coinbase_button_iframe_' + buttonId).attr('src', host + "/buttons/paid");
        return $(document).trigger('coinbase_payment_complete', buttonId);
      } else if (command === "coinbase_payment_mispaid") {
        return $(document).trigger('coinbase_payment_mispaid', buttonId);
      } else if (command === 'coinbase_payment_expired') {
        return $(document).trigger('coinbase_payment_expired', buttonId);
      } else if (command === "hide modal") {
        $('#coinbase_modal_iframe_' + buttonId).hide();
        return $(document).trigger('coinbase_modal_closed', buttonId);
      } else if (command === "signup redirect") {
        return document.location = host + "/users/verify";
      } else if (command === "button frame loaded") {
        buttonFrameLoaded = true;
        if (checkoutsFrameLoaded) {
          return $(document).trigger('coinbase_button_loaded', buttonId);
        }
      } else if (command === "checkouts frame loaded") {
        checkoutsFrameLoaded = true;
        if (buttonFrameLoaded) {
          return $(document).trigger('coinbase_button_loaded', buttonId);
        }
      }
    };
    default_width = function(button_style) {
      switch (button_style) {
        case 'custom_large':
          return 276;
        case 'custom_small':
          return 210;
        case 'subscription_large':
          return 263;
        case 'subscription_small':
          return 210;
        case 'donation_large':
          return 189;
        case 'donation_small':
          return 148;
        case 'buy_now_large':
          return 211;
        case 'buy_now_small':
          return 170;
        default:
          return 211;
      }
    };
    default_height = function(button_style) {
      switch (button_style) {
        case 'custom_large':
          return 62;
        case 'custom_small':
          return 48;
        default:
          return 46;
      }
    };
    window.addEventListener("message", receive_message, false);
    setHost($('body').data('env'));
    $('.coinbase-button').each((function(_this) {
      return function(index, elem) {
        var button, buttonFrame, buttonId, data, height, modalFrame, params, width;
        button = $(elem);
        data = button.data();
        data['referrer'] = document.domain;
        params = $.param(data);
        buttonId = button.data('code');
        width = button.data('width') || default_width(button.data('button-style'));
        height = button.data('height') || default_height(button.data('button-style'));
        setHost(button.data('env'));
        buttonFrame = "<iframe src='" + host + "/buttons/" + buttonId + "?" + params + "' id='coinbase_button_iframe_" + buttonId + "' name='coinbase_button_iframe_" + buttonId + "' style='width: " + width + "px; height: " + height + "px; border: none; overflow: hidden;' scrolling='no' allowtransparency='true' frameborder='0'></iframe>";
        modalFrame = "<iframe src='" + host + "/checkouts/" + buttonId + "/widget?" + params + "' id='coinbase_modal_iframe_" + buttonId + "' name='coinbase_modal_iframe_" + buttonId + "' style='background-color: transparent; border: 0px none transparent; display: none; position: fixed; visibility: visible; margin: 0px; padding: 0px; left: 0px; top: 0px; width: 100%; height: 100%; z-index: 9999;' scrolling='no' allowtransparency='true' frameborder='0'></iframe>";
        if (button.data('button-style') === 'none') {
          buttonFrameLoaded = true;
        } else {
          button.replaceWith(buttonFrame);
        }
        return $('body').append(modalFrame);
      };
    })(this));
    $(document).on('coinbase_show_modal', function(e, buttonId) {
      console.log('coinbase_show_modal');
      if ($("#coinbase_modal_iframe_" + buttonId).length > 0) {
        $("#coinbase_modal_iframe_" + buttonId).show();
        frames["coinbase_modal_iframe_" + buttonId].postMessage("show modal|" + buttonId, host);
        return console.log('1');
      } else {
        return console.log("Could not find Coinbase modal with id 'coinbase_modal_iframe_" + buttonId + "'. Does this match the data-code attribute in your embed HTML?");
      }
    });
    console.log('button.js', host);
    return false;
  });

}).call(this);
