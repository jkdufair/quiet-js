var TextTransmitter = (function() {
    Quiet.setProfilesPrefix("/");
    Quiet.setMemoryInitializerPrefix("/");
    Quiet.setLibfecPrefix("/");
    var btn;
    var textbox;
    var warningbox;
    var transmit;

    function onTransmitFinish() {
        textbox.focus();
        btn.addEventListener('click', onClick, false);
        btn.disabled = false;
        var originalText = btn.innerText;
        btn.innerText = btn.getAttribute('data-quiet-sending-text');
        btn.setAttribute('data-quiet-sending-text', originalText);
    };

    function onClick(e) {
        e.target.removeEventListener(e.type, arguments.callee);
        e.target.disabled = true;
        var originalText = e.target.innerText;
        e.target.innerText = e.target.getAttribute('data-quiet-sending-text');
        e.target.setAttribute('data-quiet-sending-text', originalText);
        var payload = textbox.value;
        transmit(window.nowToArray(), onTransmitFinish);
    };

    function onQuietReady() {
        var profilename = document.querySelector('[data-quiet-profile-name]').getAttribute('data-quiet-profile-name');
        transmit = Quiet.transmitter(profilename);
        btn.addEventListener('click', onClick, false);
    };

    function onQuietFail(reason) {
        console.log("quiet failed to initialize: " + reason);
        warningbox.classList.remove("hidden");
        warningbox.textContent = "Sorry, it looks like there was a problem with this example (" + reason + ")";
    };

    function onDOMLoad() {
        btn = document.querySelector('[data-quiet-send-button]');
        textbox = document.querySelector('[data-quiet-text-input]');
        warningbox = document.querySelector('[data-quiet-warning]');
        Quiet.addReadyCallback(onQuietReady, onQuietFail);
    };

    document.addEventListener("DOMContentLoaded", onDOMLoad);
})();

window.nowToArray = function() {
  var now = Date.now();
  var buf = new ArrayBuffer(8); // 2 bytes for each char
  var bufView = new Float64Array(buf);
  bufView[0] = now;
  return buf;
}

