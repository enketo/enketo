import events from 'enketo-core/src/js/event';

events.ReasonChange = function (detail) {
    return new CustomEvent('reasonchange', { detail, bubbles: true });
};

events.Heartbeat = function () {
    return new CustomEvent('heartbeat');
};

events.Hiding = function () {
    return new CustomEvent('hiding');
};

events.QueueSubmissionSuccess = function (detail) {
    return new CustomEvent('queuesubmissionsuccess', { detail, bubbles: true });
};

events.SubmissionSuccess = function () {
    return new CustomEvent('submissionsuccess', { bubbles: true });
};

events.Close = function () {
    return new CustomEvent('close', { bubbles: true });
};

events.Exit = function () {
    return new CustomEvent('exit', { bubbles: true });
};

events.SignatureRequested = function () {
    return new CustomEvent('signature-request', { bubbles: true });
};

events.AddQuery = function () {
    return new CustomEvent('addquery', { bubbles: true });
};

events.FakeInputUpdate = function () {
    return new CustomEvent('fakeinputupdate', { bubbles: true });
};

events.DelayChange = function () {
    return new CustomEvent('delaychange', { bubbles: true });
};

events.OfflineLaunchCapable = function (detail) {
    return new CustomEvent('offlinelaunchcapable', { detail, bubbles: true });
};

events.ApplicationUpdated = function () {
    return new CustomEvent('applicationupdated', { bubbles: true });
};

events.FormUpdated = function () {
    return new CustomEvent('formupdated', { bubbles: true });
};

events.FormReset = function () {
    return new CustomEvent('formreset', { bubbles: true });
};

export default events;
