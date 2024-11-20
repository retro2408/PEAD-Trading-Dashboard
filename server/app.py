import threading
import time
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit

stock_data = dict()
backtest_data = dict()

app = Flask(__name__, static_folder="../client/build", static_url_path="")
socketio = SocketIO(app, cors_allowed_origins="*")


def trading_logic(stock_data, backtest_data):
    stock_data.update(retrieve_stock_data())
    backtest_data.update(retrieve_backtest_data())
    while True:
        data = update_stock_data()
        if data:
            stock_data.update(data)
            send_update(data)
        data = update_backtest_data()
        if data:
            backtest_data.update(data)
        time.sleep(3)


def retrieve_stock_data():
    test_stock_data = {
        "A": {
            "name": "Company A",
            "price": 10.55,
            "volume": 10000,
            "eps": 1.89,
            "analyst eps": 1.32,
            "whisper number": 1.35,
            "surprise eps": 0.57,
            "trading signal": 1,  # 0 is do nothing, 1 is buy, 2 is sell
        },
        "B": {
            "name": "Company B",
            "price": 25.78,
            "volume": 15000,
            "eps": 2.45,
            "analyst eps": 2.10,
            "whisper number": 2.20,
            "surprise eps": 0.35,
            "trading signal": 0,
        },
    }
    return test_stock_data


def retrieve_backtest_data():
    test_backtest_data = {
        "A": [
            {"date": "2024-11-1", "performance": 5.34},
            {"date": "2024-11-2", "performance": -3.43},
            {"date": "2024-11-3", "performance": 3.67},
            {"date": "2024-11-4", "performance": -7.89},
            {"date": "2024-11-5", "performance": -5.34},
            {"date": "2024-11-6", "performance": 5.34},
            {"date": "2024-11-7", "performance": -3.43},
            {"date": "2024-11-8", "performance": 4.67},
            {"date": "2024-11-9", "performance": 7.89},
            {"date": "2024-11-10", "performance": 5.34},
            {"date": "2024-11-11", "performance": 5.74},
            {"date": "2024-11-12", "performance": -3.43},
            {"date": "2024-11-13", "performance": 7.67},
            {"date": "2024-11-14", "performance": 7.89},
            {"date": "2024-11-15", "performance": -5.34},
            {"date": "2024-11-16", "performance": 5.34},
            {"date": "2024-11-17", "performance": -3.43},
            {"date": "2024-11-18", "performance": 3.67},
            {"date": "2024-11-19", "performance": -7.89},
            {"date": "2024-11-20", "performance": 5.34},
        ],
        "B": [
            {"date": "2024-11-1", "performance": -2.34},
            {"date": "2024-11-2", "performance": 3.12},
            {"date": "2024-11-3", "performance": 1.78},
            {"date": "2024-11-4", "performance": -0.45},
            {"date": "2024-11-5", "performance": 2.89},
            {"date": "2024-11-6", "performance": 3.45},
            {"date": "2024-11-7", "performance": -1.67},
            {"date": "2024-11-8", "performance": 4.23},
            {"date": "2024-11-9", "performance": -3.56},
            {"date": "2024-11-10", "performance": 1.23},
            {"date": "2024-11-11", "performance": 2.34},
            {"date": "2024-11-12", "performance": 3.45},
        ],
    }
    return test_backtest_data


def update_stock_data():
    return None


def update_backtest_data():
    return None


@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")


@socketio.on("connect")
def handle_connect():
    print("Client connected")
    print("Sending stock data to client...")
    emit("stocks", stock_data)


@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")


def send_update(updated_data):
    print("Updating stock data for all clients...")
    socketio.emit("update", updated_data, broadcast=True)


@socketio.on("symbol")
def send_backtest_data(symbol):
    print("Sending backtest data for", symbol)
    emit("backtest", [symbol, backtest_data[symbol]])


if __name__ == "__main__":
    threading.Thread(
        target=trading_logic, args=(stock_data, backtest_data), daemon=True
    ).start()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
