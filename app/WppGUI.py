from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)


@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('message')
def handle_message(data):
    socketio.emit("response", data)


@socketio.on('usermsg')
def handle_usermsg(data):
    socketio.emit("responseuser", data)
    print("Mensaje del usuario: " + data)

       
if __name__ == '__main__':
    #threading.Thread(target  = dataTramites, daemon=True).start()
    app.run(debug=True)
