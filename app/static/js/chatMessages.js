var socket = io.connect('http://127.0.0.1:5000');
const messageContainer = document.getElementById('list-messages');

scrollToBottom();

document.getElementById('textbox-user-msg').addEventListener('keydown', function (event) {
    if (event.target.value) {
        if (event.ctrlKey && event.key === 'Enter') {
            event.target.value += '\n';
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault(); // Evita el comportamiento predeterminado de Enter
            socket.emit('usermsg', event.target.value);
            var style = '<div id="memessage">'
            var info = '<p>' + event.target.value + '</p>'
            setMessage(info, style, true)
            event.target.value = '';
        }
    }
});

socket.on('response', function (data) {
    var claves = Object.keys(data)
    var titular = data[claves[0]]
    var info = '<h4><b>' + titular + '</b></h4>'
    var style = '<div class="message" style="background:#BFFF00;">'
    if (claves.length > 1) {
        style = '<div class="message" style="background:#F0F8FF;">'
        claves.shift();
        for (const key in claves) {
            info += '<p>' + data[claves[key]] + '</p>'
        }
    }
    setInterval(setMessage(info, style, false), 100);
});

function setMessage(info, style, me) {
    var html = "";
    shouldScroll = $('#list-messages').scrollTop + $('#list-messages').clientHeight === $('#list-messages').scrollHeight;
    if (me) {
        html = '<div id="user-card" style="word-wrap: break-word;">' +
            style +
            info +
            '</div>' +
            '</div>';
    } else {
        html = '<div id="contact-card" style="word-wrap: break-word;">' +
            style +
            info +
            '</div>' +
            '</div>';
    }
    $('#messages').append(html);
    if (!shouldScroll) {
        scrollToBottom();
    }
}

function scrollToBottom() {
    $('#list-messages').scrollTop( $('#list-messages').prop('scrollHeight') );
}

