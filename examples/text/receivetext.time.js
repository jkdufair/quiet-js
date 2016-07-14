var TextReceiver = (function() {
    Quiet.setProfilesPrefix("/");
    Quiet.setMemoryInitializerPrefix("/");
    Quiet.setLibfecPrefix("/");
    var target;
    var content = new ArrayBuffer(0);
    var warningbox;

    function onReceive(recvPayload) {;
        const then = nowFromArray(recvPayload.buffer);
        console.log("Length: " + recvPayload.length);
        console.log("Time: " + then);
        console.log("Diff: " + (Date.now() - then));
        // content = Quiet.mergeab(content, recvPayload);
        // target.textContent = Quiet.ab2str(content);
        // warningbox.classList.add("hidden");
    };

    function onReceiverCreateFail(reason) {
        console.log("failed to create quiet receiver: " + reason);
        warningbox.classList.remove("hidden");
        warningbox.textContent = "Sorry, it looks like this example is not supported by your browser. Please give permission to use the microphone or try again in Google Chrome or Microsoft Edge."
    };

    function onReceiveFail(num_fails) {
        warningbox.classList.remove("hidden");
        warningbox.textContent = "We didn't quite get that. It looks like you tried to transmit something. You may need to move the transmitter closer to the receiver and set the volume to 50%."
    };

    function onQuietReady() {
        var profilename = document.querySelector('[data-quiet-profile-name]').getAttribute('data-quiet-profile-name');
        Quiet.receiver(profilename, onReceive, onReceiverCreateFail, onReceiveFail);
    };

    function onQuietFail(reason) {
        console.log("quiet failed to initialize: " + reason);
        warningbox.classList.remove("hidden");
        warningbox.textContent = "Sorry, it looks like there was a problem with this example (" + reason + ")";
    };

    function onDOMLoad() {
        target = document.querySelector('[data-quiet-receive-text-target]');
        warningbox = document.querySelector('[data-quiet-warning]');
        Quiet.addReadyCallback(onQuietReady, onQuietFail);
    };

    document.addEventListener("DOMContentLoaded", onDOMLoad);
})();

window.nowFromArray = function(buf) {
  console.log(buf.length);
  var bufView = new Float64Array(buf);
  return bufView[0];
}
